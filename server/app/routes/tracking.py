import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
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
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)

        for conn in disconnected:
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
