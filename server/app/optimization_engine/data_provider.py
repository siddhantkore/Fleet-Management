from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.location import Location
from app.models.maintenance import Maintenance
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.optimization_engine.types import CandidateDriver, CandidateVehicle, LocationPoint


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in kilometers between two GPS points."""
    earth_radius_km = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * earth_radius_km * math.asin(math.sqrt(a))


def get_or_create_location_point(db: Session, loc_id_or_coords: str) -> LocationPoint | None:
    """
    Resolve a location ID or 'lat,lon' string into a concrete LocationPoint.

    For ad-hoc coordinates, a stable custom location row is created if it doesn't exist.
    """
    if "," in loc_id_or_coords:
        try:
            lat_str, lon_str = loc_id_or_coords.split(",")
            lat, lon = float(lat_str), float(lon_str)
        except ValueError:
            return None

        loc_id = f"LOC-{abs(hash(loc_id_or_coords)) % 1000000}"
        existing = db.query(Location).filter(Location.location_id == loc_id).first()
        if not existing:
            existing = Location(
                location_id=loc_id,
                name=f"Custom Location ({lat_str}, {lon_str})",
                type="Custom",
                latitude=lat,
                longitude=lon,
                city="Unknown",
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)

        return LocationPoint(
            location_id=existing.location_id,
            latitude=existing.latitude,
            longitude=existing.longitude,
        )

    loc = db.query(Location).filter(Location.location_id == loc_id_or_coords).first()
    if not loc:
        return None

    return LocationPoint(location_id=loc.location_id, latitude=loc.latitude, longitude=loc.longitude)


def _last_trip_end_map(db: Session, vehicle_ids: list[str]) -> dict[str, datetime | None]:
    if not vehicle_ids:
        return {}

    rows = (
        db.query(Trip.vehicle_id, func.max(Trip.end_time))
        .filter(Trip.vehicle_id.in_(vehicle_ids))
        .group_by(Trip.vehicle_id)
        .all()
    )
    return {vehicle_id: last_end for vehicle_id, last_end in rows}


def _recent_vehicle_trip_count_map(db: Session, vehicle_ids: list[str], since: datetime) -> dict[str, int]:
    if not vehicle_ids:
        return {}

    rows = (
        db.query(Trip.vehicle_id, func.count(Trip.trip_id))
        .filter(Trip.vehicle_id.in_(vehicle_ids), Trip.start_time >= since)
        .group_by(Trip.vehicle_id)
        .all()
    )
    return {vehicle_id: count for vehicle_id, count in rows}


def _recent_driver_trip_count_map(db: Session, driver_ids: list[str], since: datetime) -> dict[str, int]:
    if not driver_ids:
        return {}

    rows = (
        db.query(Trip.driver_id, func.count(Trip.trip_id))
        .filter(Trip.driver_id.in_(driver_ids), Trip.start_time >= since)
        .group_by(Trip.driver_id)
        .all()
    )
    return {driver_id: count for driver_id, count in rows}


def _recent_maintenance_count_map(
    db: Session, vehicle_ids: list[str], since_date: date
) -> dict[str, int]:
    if not vehicle_ids:
        return {}

    rows = (
        db.query(Maintenance.vehicle_id, func.count(Maintenance.maint_id))
        .filter(Maintenance.vehicle_id.in_(vehicle_ids), Maintenance.date >= since_date)
        .group_by(Maintenance.vehicle_id)
        .all()
    )
    return {vehicle_id: count for vehicle_id, count in rows}


def eligible_vehicles(
    db: Session,
    start: LocationPoint,
    cargo_weight: float,
    cargo_volume_cbm: float,
) -> list[CandidateVehicle]:
    """Return available vehicles meeting capacity constraints plus utilization metrics."""
    vehicles = (
        db.query(Vehicle)
        .filter(
            Vehicle.current_status == "Available",
            Vehicle.capacity_kg >= cargo_weight,
            Vehicle.volume_cbm >= cargo_volume_cbm,
        )
        .all()
    )
    if not vehicles:
        return []

    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)
    one_eighty_days_ago = date.today() - timedelta(days=180)

    vehicle_ids = [v.vehicle_id for v in vehicles]
    locations = {
        loc.location_id: loc
        for loc in db.query(Location).filter(Location.location_id.in_([v.plant_loc_id for v in vehicles])).all()
    }

    last_trip_end = _last_trip_end_map(db, vehicle_ids)
    recent_trip_count = _recent_vehicle_trip_count_map(db, vehicle_ids, ninety_days_ago)
    maintenance_count = _recent_maintenance_count_map(db, vehicle_ids, one_eighty_days_ago)

    candidates: list[CandidateVehicle] = []
    for vehicle in vehicles:
        vehicle_loc = locations.get(vehicle.plant_loc_id)
        if not vehicle_loc:
            continue

        reposition_distance_km = haversine(
            vehicle_loc.latitude,
            vehicle_loc.longitude,
            start.latitude,
            start.longitude,
        )

        last_end = last_trip_end.get(vehicle.vehicle_id)
        idle_days = 365.0 if last_end is None else max(0.0, (now - last_end).total_seconds() / 86400)

        candidates.append(
            CandidateVehicle(
                vehicle=vehicle,
                reposition_distance_km=reposition_distance_km,
                recent_maintenance_events=maintenance_count.get(vehicle.vehicle_id, 0),
                idle_days=idle_days,
                recent_trip_count=recent_trip_count.get(vehicle.vehicle_id, 0),
            )
        )

    return candidates


def eligible_drivers(db: Session, start: LocationPoint) -> list[CandidateDriver]:
    """Return drivers that are active, available, not on leave, and with valid licenses."""
    today = date.today()
    drivers = (
        db.query(Driver)
        .filter(
            Driver.status == "Active",
            Driver.current_status == "Available",
            Driver.is_on_leave.is_(False),
            Driver.license_expiry >= today,
        )
        .all()
    )
    if not drivers:
        return []

    # Enforce basic data validity constraints from DB fields.
    valid_drivers = [d for d in drivers if d.driver_id and d.license_no and d.home_plant_id]
    if not valid_drivers:
        return []

    driver_ids = [d.driver_id for d in valid_drivers]
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    recent_trip_count = _recent_driver_trip_count_map(db, driver_ids, ninety_days_ago)

    locations = {
        loc.location_id: loc
        for loc in db.query(Location)
        .filter(Location.location_id.in_([d.home_plant_id for d in valid_drivers]))
        .all()
    }

    candidates: list[CandidateDriver] = []
    for driver in valid_drivers:
        driver_loc = locations.get(driver.home_plant_id)
        if not driver_loc:
            continue

        reposition_distance_km = haversine(
            driver_loc.latitude,
            driver_loc.longitude,
            start.latitude,
            start.longitude,
        )
        candidates.append(
            CandidateDriver(
                driver=driver,
                reposition_distance_km=reposition_distance_km,
                recent_trip_count=recent_trip_count.get(driver.driver_id, 0),
            )
        )

    return candidates


def planned_demand_by_origin(db: Session) -> dict[str, int]:
    """Count pending dispatch demand by origin plant/location from planned trips."""
    rows = (
        db.query(Trip.from_loc, func.count(Trip.trip_id))
        .filter(Trip.status == "Planned")
        .group_by(Trip.from_loc)
        .all()
    )
    return {from_loc: count for from_loc, count in rows}


def all_locations(db: Session) -> list[LocationPoint]:
    return [
        LocationPoint(location_id=loc.location_id, latitude=loc.latitude, longitude=loc.longitude)
        for loc in db.query(Location).all()
    ]
