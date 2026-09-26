from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text

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
    cargo_weight = Column(Float, nullable=True)
    cargo_volume_cbm = Column(Float, nullable=True, default=0.0)
    cargo_type = Column(String(100), nullable=True, default="General")
    estimated_duration_min = Column(Float, nullable=True)
    status = Column(String(20), default="Planned")  # Planned, In-Transit, Completed, Cancelled
    summary = Column(Text, nullable=True)  # LLM generated summary for selection
    route_data = Column(Text, nullable=True)  # JSON string of route geometry for map display

    def __repr__(self):
        """
        String representation of the Trip model.
        """
        return f"<Trip(id={self.trip_id}, vehicle_id={self.vehicle_id})>"
