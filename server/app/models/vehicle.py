from sqlalchemy import Column, Float, ForeignKey, Integer, String

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

    # Fuel efficiency and mileage tracking
    mileage_kmpl = Column(Float, nullable=True, default=8.0)  # km per litre
    odometer_km = Column(Integer, nullable=True, default=0)  # current odometer reading

    # Cargo density and suitability
    max_density_kg_cbm = Column(Float, nullable=True)  # max cargo density (kg/m³)
    suitable_cargo_types = Column(
        String(500), nullable=True, default="General"
    )  # comma-separated: "Iron/Steel,Chemicals,General"

    def __repr__(self):
        """
        String representation of the Vehicle model.
        """
        return f"<Vehicle(id={self.vehicle_id}, type={self.type})>"
