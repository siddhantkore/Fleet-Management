from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from app.database import Base

class Trip(Base):
    """
    Trip planning and tracking model.
    """
    __tablename__ = "trips"

    trip_id = Column(String(50), primary_key=True, index=True)
    vehicle_id = Column(String(50), ForeignKey("vehicles.vehicle_id"), nullable=False)
    driver_id = Column(String(50), ForeignKey("drivers.driver_id"), nullable=False)
    from_loc = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    to_loc = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    distance_km = Column(Float, nullable=False)
    status = Column(String(20), default="Planned") # Planned, In-Transit, Completed, Cancelled

    def __repr__(self):
        """
        String representation of the Trip model.
        """
        return f"<Trip(id={self.trip_id}, vehicle_id={self.vehicle_id})>"
