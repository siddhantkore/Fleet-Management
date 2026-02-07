from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class OwnTracksLocation(BaseModel):
    """
    Schema for OwnTracks HTTP location message.
    """
    type: str = Field(alias="_type", default="location")
    lat: float
    lon: float
    tst: int
    tid: Optional[str] = None
    topic: Optional[str] = None
    vel: Optional[float] = None  # velocity
    cog: Optional[float] = None  # course over ground
    alt: Optional[float] = None  # altitude
    acc: Optional[float] = None  # accuracy

class LiveLocationResponse(BaseModel):
    """
    Schema for sending live location to frontend.
    """
    driver_id: str
    latitude: float
    longitude: float
    updated_at: datetime

    class Config:
        from_attributes = True
