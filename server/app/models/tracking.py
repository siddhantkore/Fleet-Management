from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.sql import func

from app.database import Base


class LiveLocation(Base):
    """
    Real-time location data for drivers.
    Stores enriched telemetry from the mobile FleetTrack app.
    """

    __tablename__ = "live_locations"

    driver_id = Column(String(50), ForeignKey("drivers.driver_id"), primary_key=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)  # m/s
    heading = Column(Float, nullable=True)  # degrees, course over ground
    accuracy_h = Column(Float, nullable=True)  # horizontal accuracy in meters
    accuracy_v = Column(Float, nullable=True)  # vertical accuracy in meters
    battery_level = Column(Float, nullable=True)  # 0.0 – 1.0
    is_charging = Column(Boolean, nullable=True)
    network_type = Column(String(20), nullable=True)  # wifi, cellular, none
    activity_type = Column(String(30), nullable=True)  # idle, driving, walking, etc.
    tst = Column(DateTime(timezone=True), nullable=True)  # OwnTracks / app timestamp
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return (
            f"<LiveLocation(driver_id={self.driver_id}, lat={self.latitude}, lon={self.longitude})>"
        )
