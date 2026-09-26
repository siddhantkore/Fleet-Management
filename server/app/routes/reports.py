import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.auth import get_current_user
from app.database import get_db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.location import Location
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/trips")
def get_trip_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    driver_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    from_loc: Optional[str] = None,
    to_loc: Optional[str] = None,
    cargo_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trip reports with optional filters."""
    query = db.query(Trip)

    if start_date:
        query = query.filter(Trip.start_time >= start_date)
    if end_date:
        query = query.filter(Trip.start_time <= end_date)
    if status:
        query = query.filter(Trip.status == status)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if from_loc:
        query = query.filter(Trip.from_loc == from_loc)
    if to_loc:
        query = query.filter(Trip.to_loc == to_loc)
    if cargo_type:
        query = query.filter(Trip.cargo_type == cargo_type)

    trips = query.all()

    total_trips = len(trips)
    total_distance_km = sum((t.distance_km or 0) for t in trips)
    avg_distance_km = total_distance_km / total_trips if total_trips > 0 else 0
    total_cargo_weight_kg = sum((t.cargo_weight or 0) for t in trips)

    completed_count = sum(1 for t in trips if t.status == 'Completed')
    in_transit_count = sum(1 for t in trips if t.status == 'In-Transit')
    planned_count = sum(1 for t in trips if t.status == 'Planned')

    # Convert to dicts for serialization
    trip_records = []
    for t in trips:
        trip_records.append({
            "id": t.trip_id,
            "vehicle_id": t.vehicle_id,
            "driver_id": t.driver_id,
            "status": t.status,
            "from_location": t.from_loc,
            "to_location": t.to_loc,
            "start_time": t.start_time.isoformat() if t.start_time else None,
            "end_time": t.end_time.isoformat() if t.end_time else None,
            "distance_km": t.distance_km,
            "cargo_type": t.cargo_type,
            "cargo_weight_kg": t.cargo_weight
        })

    return {
        "summary": {
            "total_trips": total_trips,
            "total_distance_km": total_distance_km,
            "avg_distance_km": avg_distance_km,
            "total_cargo_weight_kg": total_cargo_weight_kg,
            "completed_count": completed_count,
            "in_transit_count": in_transit_count,
            "planned_count": planned_count
        },
        "records": trip_records
    }


@router.get("/vehicles")
def get_vehicle_reports(
    vehicle_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vehicle utilization report."""
    query = db.query(Vehicle)
    if vehicle_id:
        query = query.filter(Vehicle.vehicle_id == vehicle_id)
    vehicles = query.all()

    results = []
    for v in vehicles:
        trip_query = db.query(Trip).filter(Trip.vehicle_id == v.vehicle_id)
        if start_date:
            trip_query = trip_query.filter(Trip.start_time >= start_date)
        if end_date:
            trip_query = trip_query.filter(Trip.start_time <= end_date)

        v_trips = trip_query.all()
        total_trips = len(v_trips)
        total_dist = sum((t.distance_km or 0) for t in v_trips)
        avg_dist = total_dist / total_trips if total_trips > 0 else 0
        total_cost = total_dist * (v.cost_per_km or 0)

        utilization_pct = min(100, total_trips * 10) if total_trips > 0 else 0

        results.append({
            "vehicle_id": v.vehicle_id,
            "type": v.type,
            "license_plate": v.license_plate,
            "total_trips": total_trips,
            "total_distance_km": total_dist,
            "avg_distance_km": avg_dist,
            "total_cost": total_cost,
            "current_status": v.current_status,
            "utilization_pct": utilization_pct
        })
    return results


@router.get("/drivers")
def get_driver_reports(
    driver_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get driver performance report."""
    query = db.query(Driver)
    if driver_id:
        query = query.filter(Driver.driver_id == driver_id)
    drivers = query.all()

    results = []
    for d in drivers:
        trip_query = db.query(Trip).filter(Trip.driver_id == d.driver_id)
        if start_date:
            trip_query = trip_query.filter(Trip.start_time >= start_date)
        if end_date:
            trip_query = trip_query.filter(Trip.start_time <= end_date)

        d_trips = trip_query.all()
        total_trips = len(d_trips)
        total_dist = sum((t.distance_km or 0) for t in d_trips)
        avg_dist = total_dist / total_trips if total_trips > 0 else 0

        completed_trips = sum(1 for t in d_trips if t.status == 'Completed')
        on_time_pct = (completed_trips / total_trips * 100) if total_trips > 0 else 0

        results.append({
            "driver_id": d.driver_id,
            "name": d.name,
            "total_trips": total_trips,
            "total_distance_km": total_dist,
            "avg_distance_km": avg_dist,
            "rating": getattr(d, 'rating', 4.5),
            "completed_trips": completed_trips,
            "on_time_percentage": on_time_pct,
            "current_status": d.current_status
        })
    return results


@router.get("/plants")
def get_plant_reports(
    location_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get plant activity report."""
    query = db.query(Location)
    if location_id:
        query = query.filter(Location.location_id == location_id)
    plants = query.all()

    all_locs = {loc.location_id: loc.name for loc in db.query(Location).all()}

    results = []
    for p in plants:
        # Inbound
        in_query = db.query(Trip).filter(Trip.to_loc == p.location_id)
        if start_date:
            in_query = in_query.filter(Trip.start_time >= start_date)
        if end_date:
            in_query = in_query.filter(Trip.start_time <= end_date)
        in_trips = in_query.all()

        # Outbound
        out_query = db.query(Trip).filter(Trip.from_loc == p.location_id)
        if start_date:
            out_query = out_query.filter(Trip.start_time >= start_date)
        if end_date:
            out_query = out_query.filter(Trip.start_time <= end_date)
        out_trips = out_query.all()

        total_cargo_kg = sum((t.cargo_weight or 0) for t in (in_trips + out_trips))

        routes = {}
        for t in out_trips:
            dest_name = all_locs.get(t.to_loc, t.to_loc)
            routes[dest_name] = routes.get(dest_name, 0) + 1
        busiest_route = max(routes, key=routes.get) if routes else None

        results.append({
            "location_id": p.location_id,
            "name": p.name,
            "inbound_trips": len(in_trips),
            "outbound_trips": len(out_trips),
            "total_cargo_handled_kg": total_cargo_kg,
            "busiest_route": busiest_route
        })
    return results


@router.get("/costs")
def get_cost_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cost analysis report."""
    query = db.query(Trip, Vehicle).join(Vehicle, Trip.vehicle_id == Vehicle.vehicle_id)

    if start_date:
        query = query.filter(Trip.start_time >= start_date)
    if end_date:
        query = query.filter(Trip.start_time <= end_date)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)

    results = query.all()

    total_cost = 0.0
    total_dist = 0.0
    cost_by_vehicle_type = {}
    cost_by_cargo_type = {}
    routes_data = {}

    for t, v in results:
        dist = t.distance_km or 0.0
        cost = dist * (v.cost_per_km or 0.0)
        total_cost += cost
        total_dist += dist

        v_type = v.type or "Unknown"
        cost_by_vehicle_type[v_type] = cost_by_vehicle_type.get(v_type, 0.0) + cost

        c_type = t.cargo_type or "Unknown"
        cost_by_cargo_type[c_type] = cost_by_cargo_type.get(c_type, 0.0) + cost

        route_key = f"{t.from_loc} -> {t.to_loc}"
        if route_key not in routes_data:
            routes_data[route_key] = {
                "from_loc": t.from_loc,
                "to_loc": t.to_loc,
                "total_cost": 0.0,
                "trip_count": 0
            }
        routes_data[route_key]["total_cost"] += cost
        routes_data[route_key]["trip_count"] += 1

    total_trips = len(results)
    avg_cost_per_trip = total_cost / total_trips if total_trips > 0 else 0.0
    avg_cost_per_km = total_cost / total_dist if total_dist > 0 else 0.0

    cost_by_route = []
    for r_data in routes_data.values():
        cost_by_route.append({
            "from_loc": r_data["from_loc"],
            "to_loc": r_data["to_loc"],
            "avg_cost": r_data["total_cost"] / r_data["trip_count"],
            "trip_count": r_data["trip_count"]
        })

    return {
        "total_cost": total_cost,
        "avg_cost_per_trip": avg_cost_per_trip,
        "avg_cost_per_km": avg_cost_per_km,
        "cost_by_vehicle_type": cost_by_vehicle_type,
        "cost_by_cargo_type": cost_by_cargo_type,
        "cost_by_route": cost_by_route
    }


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    driver_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    location_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export endpoints to CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == 'trips':
        data = get_trip_reports(start_date, end_date, status, driver_id, vehicle_id, None, None, None, current_user, db)["records"]
        if not data:
            writer.writerow(["No data found"])
        else:
            writer.writerow(data[0].keys())
            for row in data:
                writer.writerow(row.values())

    elif report_type == 'vehicles':
        data = get_vehicle_reports(vehicle_id, start_date, end_date, current_user, db)
        if not data:
            writer.writerow(["No data found"])
        else:
            writer.writerow(data[0].keys())
            for row in data:
                writer.writerow(row.values())

    elif report_type == 'drivers':
        data = get_driver_reports(driver_id, start_date, end_date, current_user, db)
        if not data:
            writer.writerow(["No data found"])
        else:
            writer.writerow(data[0].keys())
            for row in data:
                writer.writerow(row.values())

    elif report_type == 'plants':
        data = get_plant_reports(location_id, start_date, end_date, current_user, db)
        if not data:
            writer.writerow(["No data found"])
        else:
            writer.writerow(data[0].keys())
            for row in data:
                writer.writerow(row.values())

    elif report_type == 'costs':
        data = get_cost_reports(start_date, end_date, vehicle_id, current_user, db)
        # Flatten somewhat for CSV
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Cost", data["total_cost"]])
        writer.writerow(["Avg Cost / Trip", data["avg_cost_per_trip"]])
        writer.writerow(["Avg Cost / KM", data["avg_cost_per_km"]])

        writer.writerow([])
        writer.writerow(["Vehicle Type", "Cost"])
        for v, c in data["cost_by_vehicle_type"].items():
            writer.writerow([v, c])

        writer.writerow([])
        writer.writerow(["Cargo Type", "Cost"])
        for c_type, c in data["cost_by_cargo_type"].items():
            writer.writerow([c_type, c])

        writer.writerow([])
        writer.writerow(["From", "To", "Avg Cost", "Trip Count"])
        for r in data["cost_by_route"]:
            writer.writerow([r["from_loc"], r["to_loc"], r["avg_cost"], r["trip_count"]])

    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    output.seek(0)

    headers = {
        'Content-Disposition': f'attachment; filename="{report_type}_report_{datetime.now().strftime("%Y%m%d")}.csv"'
    }

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers=headers
    )
