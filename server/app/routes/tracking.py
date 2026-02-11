import asyncio
import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver
from app.models.tracking import LiveLocation
from app.schemas.tracking import OwnTracksLocation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tracking", tags=["tracking"])


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        logger.info(f"Opening WebSocket connection from: {websocket.client}")
        logger.debug(f"Headers: {websocket.headers}")
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


@router.post("/owntracks/{driver_id}")
async def receive_owntracks_data(
    driver_id: str, data: OwnTracksLocation, db: Session = Depends(get_db)
):
    """
    Endpoint for OwnTracks HTTP mode to report location.
    """
    # Verify driver exists
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        # We might want to just ignore or log this if it's a test driver
        # but for now let's be strict or just log it
        raise HTTPException(status_code=404, detail="Driver not found")

    # Update or create live location record
    live_loc = db.query(LiveLocation).filter(LiveLocation.driver_id == driver_id).first()

    tst_dt = datetime.fromtimestamp(data.tst) if data.tst else datetime.now()

    if live_loc:
        live_loc.latitude = data.lat
        live_loc.longitude = data.lon
        live_loc.tst = tst_dt
    else:
        live_loc = LiveLocation(
            driver_id=driver_id, latitude=data.lat, longitude=data.lon, tst=tst_dt
        )
        db.add(live_loc)

    db.commit()
    db.refresh(live_loc)

    # Broadcast update to websocket clients
    from app.models.trip import Trip

    active_trip = (
        db.query(Trip).filter(Trip.driver_id == driver_id, Trip.status == "In-Transit").first()
    )

    update_data = {
        "driver_id": driver_id,
        "latitude": data.lat,
        "longitude": data.lon,
        "updated_at": (
            live_loc.updated_at.isoformat() if live_loc.updated_at else datetime.now().isoformat()
        ),
        "driver_name": driver.name if driver else "Unknown",
        "trip_id": active_trip.trip_id if active_trip else None,
    }
    await manager.broadcast(json.dumps(update_data))

    return {"status": "ok"}


@router.get("/locations", response_model=List[dict])
async def get_all_locations(db: Session = Depends(get_db)):
    """
    Get the latest known locations for all drivers.
    """
    from app.models.trip import Trip

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
        locations.append(
            {
                "driver_id": loc.driver_id,
                "driver_name": name,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "updated_at": loc.updated_at,
                "trip_id": active_trip.trip_id if active_trip else None,
            }
        )
    return locations


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
