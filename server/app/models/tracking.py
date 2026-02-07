from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class LiveLocation(Base):
    """
    Real-time location data for drivers.
    """
    __tablename__ = "live_locations"

    driver_id = Column(String(50), ForeignKey("drivers.driver_id"), primary_key=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    tst = Column(DateTime(timezone=True), nullable=True)  # OwnTracks timestamp
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<LiveLocation(driver_id={self.driver_id}, lat={self.latitude}, lon={self.longitude})>"
