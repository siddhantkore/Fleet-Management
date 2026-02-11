from sqlalchemy import Column, Float, ForeignKey, String

from app.database import Base


class Vehicle(Base):
    """
    Vehicle master data model.
    """

    __tablename__ = "vehicles"

    vehicle_id = Column(String(50), primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    plant_loc_id = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    capacity_kg = Column(Float, nullable=False)
    volume_cbm = Column(Float, nullable=False)
    fuel_type = Column(String(20), nullable=False)
    cost_per_km = Column(Float, nullable=False)
    current_status = Column(String(20), default="Available")
    license_plate = Column(String(20), unique=True, nullable=False)

    def __repr__(self):
        """
        String representation of the Vehicle model.
        """
        return f"<Vehicle(id={self.vehicle_id}, type={self.type})>"
