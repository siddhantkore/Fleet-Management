import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver
from app.models.tracking import LiveLocation
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.tracking import OwnTracksLocation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tracking", tags=["tracking"])


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        logger.info(f"Opening WebSocket connection from: {websocket.client}")
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"WebSocket connection accepted. Total connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except (WebSocketDisconnect, Exception) as e:
                logger.warning(f"Failed to send to WebSocket, removing connection: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


manager = ConnectionManager()


def _build_location_dict(loc, driver_name, active_trip):
    """Helper to build a consistent location dict for API responses and WS broadcasts."""
    return {
        "driver_id": loc.driver_id if hasattr(loc, "driver_id") else loc.get("driver_id"),
        "driver_name": driver_name,
        "latitude": loc.latitude if hasattr(loc, "latitude") else loc.get("latitude"),
        "longitude": loc.longitude if hasattr(loc, "longitude") else loc.get("longitude"),
        "altitude": getattr(loc, "altitude", None),
        "speed": getattr(loc, "speed", None),
        "heading": getattr(loc, "heading", None),
        "accuracy_h": getattr(loc, "accuracy_h", None),
        "accuracy_v": getattr(loc, "accuracy_v", None),
        "battery_level": getattr(loc, "battery_level", None),
        "is_charging": getattr(loc, "is_charging", None),
        "network_type": getattr(loc, "network_type", None),
        "activity_type": getattr(loc, "activity_type", None),
        "updated_at": (
            loc.updated_at.isoformat()
            if hasattr(loc, "updated_at") and loc.updated_at
            else datetime.now().isoformat()
        ),
        "trip_id": active_trip.trip_id if active_trip else None,
    }


def _resolve_driver_id(data: OwnTracksLocation) -> str | None:
    if data.metadata and isinstance(data.metadata, dict):
        return data.metadata.get("user_id")
    return None


def _apply_live_location_values(live_loc: LiveLocation, data: OwnTracksLocation, tst_dt: datetime):
    live_loc.latitude = data.n_lat
    live_loc.longitude = data.n_lon
    live_loc.altitude = data.n_alt
    live_loc.speed = data.n_speed
    live_loc.heading = data.n_heading
    live_loc.accuracy_h = data.n_accuracy_h
    live_loc.accuracy_v = data.n_accuracy_v
    live_loc.battery_level = data.n_battery_level
    live_loc.is_charging = data.n_is_charging
    live_loc.network_type = data.n_network_type
    live_loc.activity_type = data.n_activity_type
    live_loc.tst = tst_dt


@router.post("/owntracks/{driver_id}")
async def receive_owntracks_data(
    driver_id: str, data: OwnTracksLocation, db: Session = Depends(get_db)
):
    """
    Endpoint for OwnTracks / FleetTrack app to report location with enriched telemetry.
    """
    # Verify driver exists
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Resolve the user_id from payload metadata if available
    if data.metadata and isinstance(data.metadata, dict):
        payload_user_id = data.metadata.get("user_id")
        if payload_user_id and payload_user_id != driver_id:
            logger.warning(
                f"Payload user_id '{payload_user_id}' doesn't match URL driver_id '{driver_id}'"
            )

    # Timestamp: convert ms epoch or s epoch to datetime
    tst_val = data.n_tst
    if tst_val is not None:
        # If timestamp is in milliseconds (>1e12), convert to seconds
        if tst_val > 1e12:
            tst_val = tst_val / 1000
        tst_dt = datetime.fromtimestamp(tst_val, tz=timezone.utc)
    else:
        tst_dt = datetime.now(tz=timezone.utc)

    # Update or create live location record (safe under concurrent updates)
    try:
        live_loc = (
            db.query(LiveLocation).filter(LiveLocation.driver_id == driver_id).first()
        )
        if live_loc:
            _apply_live_location_values(live_loc, data, tst_dt)
        else:
            live_loc = LiveLocation(
                driver_id=driver_id,
                latitude=data.n_lat,
                longitude=data.n_lon,
                altitude=data.n_alt,
                speed=data.n_speed,
                heading=data.n_heading,
                accuracy_h=data.n_accuracy_h,
                accuracy_v=data.n_accuracy_v,
                battery_level=data.n_battery_level,
                is_charging=data.n_is_charging,
                network_type=data.n_network_type,
                activity_type=data.n_activity_type,
                tst=tst_dt,
            )
            db.add(live_loc)
        db.commit()
    except IntegrityError:
        # If a concurrent insert wins, retry as update for consistency
        db.rollback()
        live_loc = (
            db.query(LiveLocation).filter(LiveLocation.driver_id == driver_id).first()
        )
        if not live_loc:
            raise
        _apply_live_location_values(live_loc, data, tst_dt)
        db.commit()

    db.refresh(live_loc)

    # Broadcast update to websocket clients
    active_trip = (
        db.query(Trip).filter(Trip.driver_id == driver_id, Trip.status == "In-Transit").first()
    )

    update_data = _build_location_dict(live_loc, driver.name if driver else "Unknown", active_trip)
    await manager.broadcast(json.dumps(update_data))

    return {"status": "ok", "driver_id": driver_id}


@router.post("/owntracks")
async def receive_owntracks_data_auto(
    data: OwnTracksLocation, db: Session = Depends(get_db)
):
    """
    Endpoint for mobile apps that only provide driver_id in the payload metadata.
    """
    driver_id = _resolve_driver_id(data)
    if not driver_id:
        raise HTTPException(
            status_code=400,
            detail="driver_id missing: include in URL or payload metadata.user_id",
        )
    return await receive_owntracks_data(driver_id, data, db)


@router.get("/locations", response_model=List[dict])
async def get_all_locations(db: Session = Depends(get_db)):
    """
    Get the latest known locations for all drivers with enriched telemetry.
    """
    results = (
        db.query(LiveLocation, Driver.name)
        .join(Driver, LiveLocation.driver_id == Driver.driver_id)
        .all()
    )

    locations = []
    for loc, name in results:
        active_trip = (
            db.query(Trip)
            .filter(Trip.driver_id == loc.driver_id, Trip.status == "In-Transit")
            .first()
        )
        locations.append(_build_location_dict(loc, name, active_trip))
    return locations


@router.get("/driver-detail/{driver_id}")
async def get_driver_detail(driver_id: str, db: Session = Depends(get_db)):
    """
    Get full driver details including live location, active trip, and vehicle info.
    Used when admin clicks a driver marker on the live map.
    """
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    live_loc = db.query(LiveLocation).filter(LiveLocation.driver_id == driver_id).first()

    active_trip = (
        db.query(Trip).filter(Trip.driver_id == driver_id, Trip.status == "In-Transit").first()
    )

    # Find vehicle assigned to this driver (from active/planned trip)
    assigned_trip = (
        db.query(Trip)
        .filter(Trip.driver_id == driver_id, Trip.status.in_(["In-Transit", "Planned"]))
        .first()
    )
    vehicle = None
    if assigned_trip:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == assigned_trip.vehicle_id).first()

    return {
        "driver": {
            "driver_id": driver.driver_id,
            "name": driver.name,
            "phone": driver.phone,
            "license_no": driver.license_no,
            "license_expiry": driver.license_expiry.isoformat() if driver.license_expiry else None,
            "status": driver.status,
            "current_status": driver.current_status,
            "is_on_leave": driver.is_on_leave,
            "rating": driver.rating,
            "home_plant_id": driver.home_plant_id,
        },
        "live_location": (
            {
                "latitude": live_loc.latitude,
                "longitude": live_loc.longitude,
                "altitude": live_loc.altitude,
                "speed": live_loc.speed,
                "heading": live_loc.heading,
                "accuracy_h": live_loc.accuracy_h,
                "accuracy_v": live_loc.accuracy_v,
                "battery_level": live_loc.battery_level,
                "is_charging": live_loc.is_charging,
                "network_type": live_loc.network_type,
                "activity_type": live_loc.activity_type,
                "updated_at": live_loc.updated_at.isoformat() if live_loc.updated_at else None,
            }
            if live_loc
            else None
        ),
        "active_trip": (
            {
                "trip_id": active_trip.trip_id,
                "from_loc": active_trip.from_loc,
                "to_loc": active_trip.to_loc,
                "start_time": active_trip.start_time.isoformat() if active_trip.start_time else None,
                "distance_km": active_trip.distance_km,
                "cargo_weight": active_trip.cargo_weight,
                "status": active_trip.status,
            }
            if active_trip
            else None
        ),
        "vehicle": (
            {
                "vehicle_id": vehicle.vehicle_id,
                "type": vehicle.type,
                "license_plate": vehicle.license_plate,
                "capacity_kg": vehicle.capacity_kg,
                "volume_cbm": vehicle.volume_cbm,
                "fuel_type": vehicle.fuel_type,
                "current_status": vehicle.current_status,
            }
            if vehicle
            else None
        ),
    }


@router.get("/trip-progress/{trip_id}")
async def get_trip_progress(trip_id: str, db: Session = Depends(get_db)):
    """Get real-time progress for an active trip based on driver's current location."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Get origin and destination coordinates
    from app.models.location import Location
    from app.optimization_engine.data_provider import haversine

    origin = db.query(Location).filter(Location.location_id == trip.from_loc).first()
    destination = db.query(Location).filter(Location.location_id == trip.to_loc).first()

    if not origin or not destination:
        return {"trip_id": trip_id, "error": "Origin or destination location not found"}

    # Get driver's current location
    live_loc = db.query(LiveLocation).filter(LiveLocation.driver_id == trip.driver_id).first()

    if not live_loc:
        return {
            "trip_id": trip_id,
            "status": trip.status,
            "total_distance_km": trip.distance_km,
            "completed_distance_km": 0,
            "remaining_distance_km": trip.distance_km,
            "progress_pct": 0,
            "eta_minutes": None,
            "on_schedule": None,
            "driver_location": None,
        }

    # Calculate distances
    distance_from_origin = haversine(
        origin.latitude, origin.longitude,
        live_loc.latitude, live_loc.longitude
    )
    distance_to_destination = haversine(
        live_loc.latitude, live_loc.longitude,
        destination.latitude, destination.longitude
    )

    # Estimate completed distance (capped at total trip distance)
    completed_km = min(distance_from_origin, trip.distance_km)
    remaining_km = max(0, trip.distance_km - completed_km)
    progress_pct = round((completed_km / max(trip.distance_km, 0.1)) * 100, 1)

    # ETA calculation based on current speed
    eta_minutes = None
    if live_loc.speed and live_loc.speed > 0.5:  # > 0.5 m/s (moving)
        speed_kmh = live_loc.speed * 3.6
        eta_minutes = round((remaining_km / speed_kmh) * 60, 1)

    # On-schedule check
    on_schedule = None
    estimated_duration_min = trip.estimated_duration_min
    if estimated_duration_min and trip.start_time:
        from datetime import datetime, timezone
        elapsed_min = (datetime.now(timezone.utc) - trip.start_time.replace(tzinfo=timezone.utc)).total_seconds() / 60
        expected_progress_pct = min(100, (elapsed_min / estimated_duration_min) * 100)
        # If actual progress is within 15% of expected, consider on-schedule
        if progress_pct >= expected_progress_pct - 15:
            on_schedule = True
        else:
            on_schedule = False

    return {
        "trip_id": trip_id,
        "status": trip.status,
        "total_distance_km": round(trip.distance_km, 2),
        "completed_distance_km": round(completed_km, 2),
        "remaining_distance_km": round(remaining_km, 2),
        "progress_pct": min(progress_pct, 100),
        "eta_minutes": eta_minutes,
        "on_schedule": on_schedule,
        "estimated_duration_min": estimated_duration_min,
        "driver_location": {
            "latitude": live_loc.latitude,
            "longitude": live_loc.longitude,
            "speed": live_loc.speed,
            "heading": live_loc.heading,
            "updated_at": live_loc.updated_at.isoformat() if live_loc.updated_at else None,
        },
    }


@router.get("/resource-analysis")
async def get_resource_analysis(db: Session = Depends(get_db)):
    """Get comprehensive resource analysis: all drivers and vehicles with current vs home locations."""
    from app.models.location import Location
    from app.optimization_engine.data_provider import haversine

    # Get all locations for lookup
    locations = {loc.location_id: loc for loc in db.query(Location).all()}

    # Get all drivers with their live locations
    drivers = db.query(Driver).all()
    live_locs = {ll.driver_id: ll for ll in db.query(LiveLocation).all()}

    driver_data = []
    for driver in drivers:
        home_loc = locations.get(driver.home_plant_id)
        live_loc = live_locs.get(driver.driver_id)

        # Find active trip
        active_trip = db.query(Trip).filter(
            Trip.driver_id == driver.driver_id,
            Trip.status.in_(["In-Transit", "Planned"])
        ).first()

        distance_from_home = None
        if home_loc and live_loc:
            distance_from_home = round(haversine(
                home_loc.latitude, home_loc.longitude,
                live_loc.latitude, live_loc.longitude
            ), 2)

        driver_data.append({
            "driver_id": driver.driver_id,
            "name": driver.name,
            "phone": driver.phone,
            "status": driver.status,
            "current_status": driver.current_status,
            "is_on_leave": driver.is_on_leave,
            "rating": driver.rating,
            "home_plant_id": driver.home_plant_id,
            "home_plant_name": home_loc.name if home_loc else None,
            "home_location": {"lat": home_loc.latitude, "lng": home_loc.longitude} if home_loc else None,
            "current_location": {
                "lat": live_loc.latitude,
                "lng": live_loc.longitude,
                "speed": live_loc.speed,
                "updated_at": live_loc.updated_at.isoformat() if live_loc.updated_at else None,
            } if live_loc else None,
            "distance_from_home_km": distance_from_home,
            "active_trip": {
                "trip_id": active_trip.trip_id,
                "from_loc": active_trip.from_loc,
                "to_loc": active_trip.to_loc,
                "status": active_trip.status,
            } if active_trip else None,
        })

    # Get all vehicles with their plant locations
    vehicles = db.query(Vehicle).all()
    vehicle_data = []
    for vehicle in vehicles:
        plant_loc = locations.get(vehicle.plant_loc_id)

        active_trip = db.query(Trip).filter(
            Trip.vehicle_id == vehicle.vehicle_id,
            Trip.status.in_(["In-Transit", "Planned"])
        ).first()

        vehicle_data.append({
            "vehicle_id": vehicle.vehicle_id,
            "type": vehicle.type,
            "license_plate": vehicle.license_plate,
            "current_status": vehicle.current_status,
            "fuel_type": vehicle.fuel_type,
            "capacity_kg": vehicle.capacity_kg,
            "odometer_km": vehicle.odometer_km,
            "plant_loc_id": vehicle.plant_loc_id,
            "plant_name": plant_loc.name if plant_loc else None,
            "plant_location": {"lat": plant_loc.latitude, "lng": plant_loc.longitude} if plant_loc else None,
            "active_trip": {
                "trip_id": active_trip.trip_id,
                "from_loc": active_trip.from_loc,
                "to_loc": active_trip.to_loc,
                "status": active_trip.status,
            } if active_trip else None,
        })

    return {
        "drivers": driver_data,
        "vehicles": vehicle_data,
        "summary": {
            "total_drivers": len(drivers),
            "available_drivers": sum(1 for d in drivers if d.current_status == "Available"),
            "on_trip_drivers": sum(1 for d in drivers if d.current_status == "On-Trip"),
            "total_vehicles": len(vehicles),
            "available_vehicles": sum(1 for v in vehicles if v.current_status == "Available"),
            "on_trip_vehicles": sum(1 for v in vehicles if v.current_status in ["On-Trip", "Assigned"]),
        }
    }


@router.put("/resource/driver/{driver_id}/location")
async def update_driver_location(
    driver_id: str,
    lat: float = Query(...),
    lng: float = Query(...),
    db: Session = Depends(get_db),
):
    """Admin endpoint to manually update a driver's current location (e.g., when driver returns without a trip)."""
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    live_loc = db.query(LiveLocation).filter(LiveLocation.driver_id == driver_id).first()
    if live_loc:
        live_loc.latitude = lat
        live_loc.longitude = lng
        live_loc.speed = 0
        live_loc.activity_type = "stationary"
    else:
        live_loc = LiveLocation(
            driver_id=driver_id,
            latitude=lat,
            longitude=lng,
            speed=0,
            activity_type="stationary",
        )
        db.add(live_loc)

    # Update driver status to Available if they were on trip
    if driver.current_status in ["On-Trip", "Assigned"]:
        driver.current_status = "Available"

    db.commit()
    return {"status": "ok", "driver_id": driver_id, "message": "Location updated successfully"}


@router.websocket("/ws")
async def websocket_tracking(websocket: WebSocket):
    logger.info("New WebSocket request received at /ws")
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, though we mostly broadcast
            await asyncio.sleep(30)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
