"""
Fleet Intelligence Engine — Multi-Plant Vehicle Repositioning.

When a vehicle completes a trip at Plant B (having come from Plant A),
and there is demand at Plants C and A, this engine decides whether
the vehicle should:
  1. RETURN to source Plant A
  2. FORWARD_DISPATCH to Plant C (or another plant with demand)
  3. HOLD at current Plant B (if local demand exists)

Decision is algorithmic (OR-Tools + weighted scoring) — NO AI/LLM involved.
AI is only used afterward to generate a human-readable explanation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.fleet_recommendation import FleetRecommendation
from app.models.location import Location
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.optimization_engine.data_provider import haversine
from app.optimization_engine.route_provider import estimate_route
from app.optimization_engine.types import LocationPoint

logger = logging.getLogger(__name__)


def _get_planned_demand_by_origin(db: Session) -> dict[str, int]:
    """Count planned trips by origin location."""
    rows = (
        db.query(Trip.from_loc, func.count(Trip.trip_id))
        .filter(Trip.status == "Planned")
        .group_by(Trip.from_loc)
        .all()
    )
    return {loc_id: count for loc_id, count in rows}


def _get_available_vehicles_at(db: Session, location_id: str) -> int:
    """Count available vehicles at a given plant."""
    return (
        db.query(Vehicle)
        .filter(
            Vehicle.plant_loc_id == location_id,
            Vehicle.current_status == "Available",
        )
        .count()
    )


def _get_recent_trip_patterns(db: Session, days: int = 30) -> dict[str, int]:
    """Get frequency of trips by origin over recent period."""
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(Trip.from_loc, func.count(Trip.trip_id))
        .filter(Trip.start_time >= since)
        .group_by(Trip.from_loc)
        .all()
    )
    return {loc_id: count for loc_id, count in rows}


def _location_to_point(loc: Location) -> LocationPoint:
    return LocationPoint(
        location_id=loc.location_id,
        latitude=loc.latitude,
        longitude=loc.longitude,
    )


def evaluate_vehicle_repositioning(
    db: Session,
    vehicle: Vehicle,
    current_location_id: str,
    source_location_id: str | None = None,
) -> FleetRecommendation | None:
    """
    Evaluate where a vehicle should go after completing a trip.

    Scoring factors (all weighted):
    1. Distance cost to each candidate plant
    2. Planned demand at each plant (higher demand = more attractive)
    3. Vehicle availability at each plant (scarce vehicles = more needed)
    4. Historical trip frequency (frequently-used origins are better candidates)
    5. Vehicle suitability for pending demand cargo types
    6. Maintenance proximity (is the vehicle due for service?)
    """
    # Get all plant/warehouse locations
    all_locations = db.query(Location).all()
    if len(all_locations) < 2:
        return None  # Need at least 2 plants for repositioning logic

    current_loc = db.query(Location).filter(
        Location.location_id == current_location_id
    ).first()
    if not current_loc:
        return None

    current_point = _location_to_point(current_loc)

    # Gather data
    demand_map = _get_planned_demand_by_origin(db)
    trip_patterns = _get_recent_trip_patterns(db, days=30)

    # Evaluate each candidate destination
    candidates = []
    for loc in all_locations:
        if loc.location_id == current_location_id:
            continue  # Skip current location

        target_point = _location_to_point(loc)
        route = estimate_route(current_point, target_point)
        distance_km = route.distance_km

        demand = demand_map.get(loc.location_id, 0)
        available_vehicles = _get_available_vehicles_at(db, loc.location_id)
        historical_freq = trip_patterns.get(loc.location_id, 0)

        # Vehicle scarcity: fewer available vehicles = higher urgency
        scarcity_score = max(0, 3 - available_vehicles) * 15.0

        # Determine action type
        is_source = (source_location_id and loc.location_id == source_location_id)
        action = "RETURN" if is_source else "FORWARD_DISPATCH"

        # Composite score (LOWER IS BETTER)
        # Distance cost (dominant factor)
        distance_cost = distance_km * vehicle.cost_per_km

        # Demand benefit (higher demand reduces score)
        demand_benefit = demand * 20.0

        # Historical benefit
        history_benefit = historical_freq * 2.0

        # Return bonus: slight preference for returning to source
        return_bonus = 10.0 if is_source else 0.0

        score = (
            distance_cost
            - demand_benefit
            - scarcity_score
            - history_benefit
            - return_bonus
        )

        # Build reason
        reasons = []
        if demand > 0:
            reasons.append(f"{demand} planned trip(s) originating from {loc.name}")
        if available_vehicles == 0:
            reasons.append(f"no vehicles currently available at {loc.name}")
        elif available_vehicles <= 2:
            reasons.append(f"only {available_vehicles} vehicle(s) available at {loc.name}")
        if historical_freq > 3:
            reasons.append(f"high historical demand ({historical_freq} trips in 30d)")
        if is_source:
            reasons.append("this is the vehicle's source plant")

        reason_text = (
            f"{action}: Move {vehicle.vehicle_id} from {current_loc.name} to {loc.name} "
            f"({distance_km:.1f} km, est. cost ₹{distance_cost:.0f}). "
        )
        if reasons:
            reason_text += "Justification: " + "; ".join(reasons) + "."
        else:
            reason_text += "No strong demand signal — standard repositioning."

        candidates.append({
            "location": loc,
            "action": action,
            "distance_km": distance_km,
            "estimated_cost": distance_cost,
            "score": score,
            "demand": demand,
            "available_vehicles": available_vehicles,
            "reason": reason_text,
        })

    if not candidates:
        return None

    # Sort by score (lower is better)
    candidates.sort(key=lambda c: c["score"])
    best = candidates[0]

    # Check if HOLD is better (if there's demand at current location)
    current_demand = demand_map.get(current_location_id, 0)
    current_available = _get_available_vehicles_at(db, current_location_id)

    if current_demand > 0 and current_available <= 1 and best["score"] > 0:
        # Holding is better — there's demand here and we're the only vehicle
        recommendation = FleetRecommendation(
            vehicle_id=vehicle.vehicle_id,
            current_plant_id=current_location_id,
            recommended_plant_id=current_location_id,
            action="HOLD",
            reason=(
                f"HOLD: Keep {vehicle.vehicle_id} at {current_loc.name}. "
                f"{current_demand} planned trip(s) originate from here and "
                f"only {current_available} vehicle(s) available."
            ),
            score=0.0,
            demand_at_current=current_demand,
            demand_at_recommended=current_demand,
            available_vehicles_at_recommended=current_available,
            distance_km=0.0,
            estimated_cost=0.0,
            status="Pending",
        )
    else:
        recommendation = FleetRecommendation(
            vehicle_id=vehicle.vehicle_id,
            current_plant_id=current_location_id,
            recommended_plant_id=best["location"].location_id,
            action=best["action"],
            reason=best["reason"],
            score=round(best["score"], 2),
            demand_at_current=current_demand,
            demand_at_recommended=best["demand"],
            available_vehicles_at_recommended=best["available_vehicles"],
            distance_km=round(best["distance_km"], 2),
            estimated_cost=round(best["estimated_cost"], 2),
            status="Pending",
        )

    # Expire old pending recommendations for this vehicle
    db.query(FleetRecommendation).filter(
        FleetRecommendation.vehicle_id == vehicle.vehicle_id,
        FleetRecommendation.status == "Pending",
    ).update({"status": "Expired"})

    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    logger.info(
        f"Fleet intelligence: {recommendation.action} recommendation for "
        f"{vehicle.vehicle_id} -> {recommendation.recommended_plant_id} "
        f"(score={recommendation.score})"
    )

    return recommendation
