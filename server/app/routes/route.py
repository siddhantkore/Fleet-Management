"""Route analysis API endpoints."""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.trip import Trip
from app.models.user import User
from app.optimization_engine.data_provider import get_or_create_location_point
from app.optimization_engine.route_optimizer import optimize_routes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/routes", tags=["routes"])


class RouteOptimizeRequest(BaseModel):
    from_loc: str
    to_loc: str
    cargo_weight: float = 1000.0
    vehicle_mileage_kmpl: float = 8.0
    vehicle_capacity_kg: float = 10000.0
    max_alternatives: int = 4


class RouteDetail(BaseModel):
    index: int
    distance_km: float
    duration_minutes: float
    geometry_coords: List[List[float]]
    ascent_m: float
    descent_m: float
    score: float
    is_selected: bool


class RouteOptimizeResponse(BaseModel):
    mode: str
    selected_index: int
    routes: List[RouteDetail]
    error: Optional[str] = None


@router.post("/optimize", response_model=RouteOptimizeResponse)
def optimize_route(
    request: RouteOptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get optimized route alternatives between two locations."""
    start = get_or_create_location_point(db, request.from_loc)
    end = get_or_create_location_point(db, request.to_loc)

    if not start or not end:
        raise HTTPException(status_code=400, detail="Invalid source or destination")

    result = optimize_routes(
        start, end,
        vehicle_mileage_kmpl=request.vehicle_mileage_kmpl,
        cargo_weight_kg=request.cargo_weight,
        vehicle_capacity_kg=request.vehicle_capacity_kg,
        max_alternatives=request.max_alternatives,
    )

    return RouteOptimizeResponse(
        mode=result.mode,
        selected_index=result.selected_index,
        routes=[
            RouteDetail(
                index=r.index,
                distance_km=r.distance_km,
                duration_minutes=r.duration_minutes,
                geometry_coords=r.geometry_coords,
                ascent_m=r.ascent_m,
                descent_m=r.descent_m,
                score=r.score,
                is_selected=r.is_selected,
            )
            for r in result.routes
        ],
        error=result.error,
    )


@router.get("/trip/{trip_id}")
def get_trip_routes(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get stored route data for a specific trip."""
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    import json
    route_data = None
    if trip.route_data:
        try:
            route_data = json.loads(trip.route_data)
        except json.JSONDecodeError:
            route_data = None

    return {
        "trip_id": trip_id,
        "from_loc": trip.from_loc,
        "to_loc": trip.to_loc,
        "distance_km": trip.distance_km,
        "route_data": route_data,
    }
