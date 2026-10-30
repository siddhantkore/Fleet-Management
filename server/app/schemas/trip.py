from datetime import datetime
from typing import Optional

from pydantic import BaseModel

# Predefined cargo categories — users can add more via the UI
CARGO_CATEGORIES = [
    "General",
    "Iron/Steel",
    "Cotton/Textile",
    "Electronics",
    "Chemicals",
    "Food/Perishable",
    "Construction Material",
    "Machinery/Equipment",
    "Automotive Parts",
    "Pharmaceuticals",
]


class TripBase(BaseModel):
    """
    Base schema for Trip data.
    """

    trip_id: str
    vehicle_id: str
    driver_id: str
    from_loc: str
    to_loc: str
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_km: float
    cargo_weight: Optional[float] = None
    cargo_volume_cbm: Optional[float] = 0.0
    cargo_type: Optional[str] = "General"
    estimated_duration_min: Optional[float] = None
    status: str
    summary: Optional[str] = None
    route_data: Optional[str] = None


class TripCreate(TripBase):
    """
    Schema for creating a new Trip.
    """

    pass


class TripScheduleRequest(BaseModel):
    """
    Schema for admin to request a trip schedule.
    """

    from_loc: str  # location_id or "lat,lng"
    to_loc: str  # location_id or "lat,lng"
    start_time: datetime
    end_time: Optional[datetime] = None
    cargo_weight: float
    cargo_volume_cbm: Optional[float] = 0.0
    cargo_type: Optional[str] = "General"
    optimize: Optional[bool] = True


class TripResponse(TripBase):
    """
    Schema for Trip response.
    """

    class Config:
        from_attributes = True
