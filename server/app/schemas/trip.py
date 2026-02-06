from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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
    status: str

class TripCreate(TripBase):
    """
    Schema for creating a new Trip.
    """
    pass

class TripResponse(TripBase):
    """
    Schema for Trip response.
    """
    class Config:
        from_attributes = True
