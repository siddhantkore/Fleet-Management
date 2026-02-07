from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime
import asyncio

from app.database import get_db
from app.models.tracking import LiveLocation
from app.schemas.tracking import OwnTracksLocation, LiveLocationResponse
from app.models.driver import Driver

router = APIRouter(prefix="/tracking", tags=["tracking"])

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Remove stale connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@router.post("/owntracks/{driver_id}")
async def receive_owntracks_data(
    driver_id: str,
    data: OwnTracksLocation,
    db: Session = Depends(get_db)
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
            driver_id=driver_id,
            latitude=data.lat,
            longitude=data.lon,
            tst=tst_dt
        )
        db.add(live_loc)

    db.commit()
    db.refresh(live_loc)

    # Broadcast update to websocket clients
    update_data = {
        "driver_id": driver_id,
        "latitude": data.lat,
        "longitude": data.lon,
        "updated_at": live_loc.updated_at.isoformat() if live_loc.updated_at else datetime.now().isoformat(),
        "driver_name": driver.name if driver else "Unknown"
    }
    await manager.broadcast(json.dumps(update_data))

    return {"status": "ok"}

@router.get("/locations", response_model=List[dict])
async def get_all_locations(db: Session = Depends(get_db)):
    """
    Get the latest known locations for all drivers.
    """
    results = db.query(LiveLocation, Driver.name).join(
        Driver, LiveLocation.driver_id == Driver.driver_id
    ).all()
    
    locations = []
    for loc, name in results:
        locations.append({
            "driver_id": loc.driver_id,
            "driver_name": name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "updated_at": loc.updated_at
        })
    return locations

@router.websocket("/ws")
async def websocket_tracking(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, though we mostly broadcast
            await asyncio.sleep(30)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
