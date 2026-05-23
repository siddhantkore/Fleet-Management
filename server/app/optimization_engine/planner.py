from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.optimization_engine.data_provider import (
    all_locations,
    eligible_drivers,
    eligible_vehicles,
    get_or_create_location_point,
    planned_demand_by_origin,
)
from app.optimization_engine.route_optimizer import (
    RouteOptimizationResult,
    optimize_routes,
    routes_to_json,
)
from app.optimization_engine.route_provider import estimate_route
from app.optimization_engine.solver import (
    AssignmentInput,
    ContinuationOption,
    solve_best_assignment,
    solve_continuation_option,
)
from app.optimization_engine.types import ContinuationRecommendation, LocationPoint


def _continuation_recommendation(
    db: Session,
    source: LocationPoint,
    destination: LocationPoint,
    vehicle_cost_per_km: float,
) -> ContinuationRecommendation:
    """
    Recommend reposition action after reaching destination:
    return to source plant or move to another plant with planned demand.
    """
    if not source or not destination:
        return ContinuationRecommendation(
            destination_id="Unknown",
            distance_km=0.0,
            estimated_cost=0.0,
            reason="Insufficient location data for continuation optimization.",
        )

    demand_map = planned_demand_by_origin(db)
    locations = {loc.location_id: loc for loc in all_locations(db)}

    options: list[ContinuationOption] = []
    back_route = estimate_route(destination, source)
    back_distance = back_route.distance_km
    options.append(
        ContinuationOption(destination_id=source.location_id, distance_km=back_distance, demand_count=0)
    )

    for plant_id, demand_count in demand_map.items():
        if plant_id == destination.location_id:
            continue
        target = locations.get(plant_id)
        if not target:
            continue
        move_distance = estimate_route(destination, target).distance_km
        options.append(
            ContinuationOption(
                destination_id=plant_id,
                distance_km=move_distance,
                demand_count=int(demand_count),
            )
        )

    try:
        continuation_decision = solve_continuation_option(options)
        selected_option = options[continuation_decision.option_index]
    except RuntimeError:
        selected_option = options[0]

    if selected_option.destination_id == source.location_id:
        reason = (
            "Return to the source plant is currently more cost-efficient than "
            "repositioning to another demand location."
        )
    else:
        reason = (
            f"Move to {selected_option.destination_id}: planned outbound demand there is high enough "
            "to justify repositioning instead of returning."
        )

    return ContinuationRecommendation(
        destination_id=selected_option.destination_id,
        distance_km=round(selected_option.distance_km, 2),
        estimated_cost=round(selected_option.distance_km * vehicle_cost_per_km, 2),
        reason=reason,
    )


def _build_summary(
    from_id: str,
    to_id: str,
    cargo_weight: float,
    cargo_volume_cbm: float,
    cargo_type: str,
    route_distance_km: float,
    route_mode: str,
    estimated_cost: float,
    selected_vehicle,
    selected_driver,
    continuation: ContinuationRecommendation,
    route_result: RouteOptimizationResult | None = None,
) -> str:
    lines = [
        "**Trip Optimization Report (OR-Tools)**\n",
        f"Trip request: {from_id} -> {to_id}",
        f"Cargo: {cargo_weight:.2f} kg | {cargo_volume_cbm:.2f} cbm | Type: {cargo_type}\n",
        f"Selected vehicle: {selected_vehicle.vehicle.vehicle_id}"
        f" ({selected_vehicle.vehicle.license_plate})",
        f"- Type: {selected_vehicle.vehicle.type}",
        f"- Capacity: {selected_vehicle.vehicle.capacity_kg:.2f} kg"
        f" | {selected_vehicle.vehicle.volume_cbm:.2f} cbm",
        f"- Fuel: {selected_vehicle.vehicle.fuel_type}"
        f" | Mileage: {selected_vehicle.effective_mileage:.1f} km/L (loaded)",
        f"- Cargo suitability: {selected_vehicle.cargo_density_score:.0%}",
        f"- Maintenance events (180d): {selected_vehicle.recent_maintenance_events}",
        f"- Idle days: {selected_vehicle.idle_days:.1f}",
        f"- Reposition to source: {selected_vehicle.reposition_distance_km:.2f} km\n",
        f"Selected driver: {selected_driver.driver.driver_id} ({selected_driver.driver.name})",
        f"- License valid until: {selected_driver.driver.license_expiry}",
        f"- Recent trips (90d): {selected_driver.recent_trip_count}",
        f"- Reposition to source: {selected_driver.reposition_distance_km:.2f} km\n",
        "Route plan:",
        f"- Primary route mode: {route_mode}",
        f"- Distance: {route_distance_km:.2f} km",
        f"- Estimated operational cost: ${estimated_cost:.2f}",
    ]

    if route_result and len(route_result.routes) > 1:
        lines.append(f"- Routes analyzed: {len(route_result.routes)}")
        for r in route_result.routes:
            marker = "✅ SELECTED" if r.is_selected else "⬜ Alternative"
            lines.append(
                f"  [{marker}] Route {r.index + 1}: {r.distance_km} km, "
                f"{r.duration_minutes:.0f} min, score={r.score}"
            )

    lines.extend([
        "\nContinuation recommendation after delivery:",
        f"- Next move: {to_id} -> {continuation.destination_id}",
        f"- Distance: {continuation.distance_km:.2f} km"
        f" | Cost: ${continuation.estimated_cost:.2f}",
        f"- Reason: {continuation.reason}",
    ])

    return "\n".join(lines)


from datetime import datetime, timedelta

def optimize_trip(
    db: Session,
    from_loc: str,
    to_loc: str,
    cargo_weight: float,
    cargo_volume_cbm: float = 0.0,
    cargo_type: str = "General",
    start_time: datetime = None,
):
    """Optimize dispatch selection using a decoupled OR-Tools assignment module."""
    if cargo_weight <= 0:
        return None, "Cargo weight must be greater than zero."
    if cargo_volume_cbm < 0:
        return None, "Cargo volume cannot be negative."

    start = get_or_create_location_point(db, from_loc)
    destination = get_or_create_location_point(db, to_loc)
    if not start or not destination:
        return None, "Invalid source or destination coordinates/location ID."

    # Estimate travel duration to define the scheduling window
    route_estimate = estimate_route(start, destination)
    est_duration_min = (route_estimate.distance_km / 50.0) * 60.0 * 1.15 + 120.0 # 50 km/h + 15% buffer + 2h loading

    req_start = start_time if start_time else datetime.utcnow()
    req_end = req_start + timedelta(minutes=est_duration_min)

    vehicles = eligible_vehicles(
        db,
        start,
        cargo_weight,
        cargo_volume_cbm,
        cargo_type,
        req_start=req_start,
        req_end=req_end,
    )
    if not vehicles:
        return None, "No available vehicles meet weight/volume constraints for this time window."

    drivers = eligible_drivers(db, start, req_start=req_start, req_end=req_end)
    if not drivers:
        return None, "No eligible drivers are currently available for this time window."

    # Get route alternatives with geometry
    route_result = optimize_routes(
        start,
        destination,
        vehicle_mileage_kmpl=vehicles[0].effective_mileage if vehicles else 8.0,
        cargo_weight_kg=cargo_weight,
        vehicle_capacity_kg=vehicles[0].vehicle.capacity_kg if vehicles else 10000.0,
        max_alternatives=4,
    )

    # Use the selected route distance for assignment optimization
    if route_result.routes:
        selected_route = route_result.routes[route_result.selected_index]
        route_distance_km = selected_route.distance_km
    else:
        route_estimate = estimate_route(start, destination)
        route_distance_km = route_estimate.distance_km

    try:
        decision = solve_best_assignment(
            AssignmentInput(
                start_location_id=start.location_id,
                route_distance_km=route_distance_km,
                vehicles=vehicles,
                drivers=drivers,
            )
        )
    except RuntimeError as exc:
        return None, str(exc)

    selected_vehicle = vehicles[decision.vehicle_index]
    selected_driver = drivers[decision.driver_index]

    estimated_cost = (
        (route_distance_km + selected_vehicle.reposition_distance_km)
        * selected_vehicle.vehicle.cost_per_km
        + (selected_driver.reposition_distance_km * 0.35)
    )

    continuation = _continuation_recommendation(
        db,
        source=start,
        destination=destination,
        vehicle_cost_per_km=selected_vehicle.vehicle.cost_per_km,
    )

    summary = _build_summary(
        from_id=start.location_id,
        to_id=destination.location_id,
        cargo_weight=cargo_weight,
        cargo_volume_cbm=cargo_volume_cbm,
        cargo_type=cargo_type,
        route_distance_km=route_distance_km,
        route_mode=route_result.mode,
        estimated_cost=estimated_cost,
        selected_vehicle=selected_vehicle,
        selected_driver=selected_driver,
        continuation=continuation,
        route_result=route_result,
    )

    # Serialize route data for storage and frontend
    route_data_json = routes_to_json(route_result) if route_result.routes else None

    return {
        "vehicle_id": selected_vehicle.vehicle.vehicle_id,
        "driver_id": selected_driver.driver.driver_id,
        "distance_km": round(route_distance_km, 2),
        "summary": summary,
        "from_id": start.location_id,
        "to_id": destination.location_id,
        "cargo_type": cargo_type,
        "continuation_destination_id": continuation.destination_id,
        "continuation_distance_km": continuation.distance_km,
        "continuation_estimated_cost": continuation.estimated_cost,
        "route_data": route_data_json,
        "generated_at": datetime.utcnow().isoformat(),
    }, None
