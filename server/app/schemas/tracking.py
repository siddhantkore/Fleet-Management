from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class OwnTracksLocation(BaseModel):
    """
    Schema for receiving location data from the mobile FleetTrack app.

    Supports two payload formats:
    1. Legacy OwnTracks flat format: {lat, lon, tst, tid, ...}
    2. New FleetTrack nested format: {location: {coords: {lat, lng}, motion: {...}}, context: {...}, ...}
    """

    # --- Legacy OwnTracks flat fields ---
    type: Optional[str] = Field(alias="_type", default="location")
    lat: Optional[float] = None
    lon: Optional[float] = None
    tst: Optional[int] = None
    tid: Optional[str] = None
    topic: Optional[str] = None

    # --- Legacy OwnTracks optional fields ---
    vel: Optional[float] = None  # velocity (legacy)
    cog: Optional[float] = None  # course over ground (legacy)
    alt: Optional[float] = None  # altitude (legacy)
    acc: Optional[float] = None  # accuracy (legacy)

    # --- New FleetTrack nested fields ---
    metadata: Optional[dict] = None
    timestamp: Optional[dict] = None
    location: Optional[dict] = None
    context: Optional[dict] = None
    events: Optional[list] = None

    # --- Normalised output fields (populated by validator) ---
    n_lat: Optional[float] = None
    n_lon: Optional[float] = None
    n_alt: Optional[float] = None
    n_speed: Optional[float] = None
    n_heading: Optional[float] = None
    n_accuracy_h: Optional[float] = None
    n_accuracy_v: Optional[float] = None
    n_battery_level: Optional[float] = None
    n_is_charging: Optional[bool] = None
    n_network_type: Optional[str] = None
    n_activity_type: Optional[str] = None
    n_tst: Optional[int] = None

    @model_validator(mode="after")
    def normalise_fields(self):
        """Resolve both formats into consistent n_* fields."""
        # Check if new nested format is present
        if self.location and isinstance(self.location, dict):
            coords = self.location.get("coords", {})
            motion = self.location.get("motion", {})
            self.n_lat = coords.get("lat", self.lat)
            self.n_lon = coords.get("lng", self.lon)
            self.n_alt = coords.get("alt", self.alt)
            self.n_speed = motion.get("speed", self.vel)
            self.n_heading = motion.get("heading", self.cog)
            self.n_accuracy_h = motion.get("accuracy_h", self.acc)
            self.n_accuracy_v = motion.get("accuracy_v")
        else:
            # Legacy flat format
            self.n_lat = self.lat
            self.n_lon = self.lon
            self.n_alt = self.alt
            self.n_speed = self.vel
            self.n_heading = self.cog
            self.n_accuracy_h = self.acc
            self.n_accuracy_v = None

        # Context fields
        if self.context and isinstance(self.context, dict):
            self.n_battery_level = self.context.get("battery_level")
            self.n_is_charging = self.context.get("is_charging")
            self.n_network_type = self.context.get("network_type")
            self.n_activity_type = self.context.get("activity_type")

        # Timestamp
        if self.timestamp and isinstance(self.timestamp, dict):
            self.n_tst = self.timestamp.get("captured_at") or self.timestamp.get("sent_at") or self.tst
        else:
            self.n_tst = self.tst

        return self

    class Config:
        populate_by_name = True


class LiveLocationResponse(BaseModel):
    """
    Schema for sending live location to frontend.
    """

    driver_id: str
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy_h: Optional[float] = None
    accuracy_v: Optional[float] = None
    battery_level: Optional[float] = None
    is_charging: Optional[bool] = None
    network_type: Optional[str] = None
    activity_type: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True
