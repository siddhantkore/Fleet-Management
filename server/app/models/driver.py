from sqlalchemy import Column, String, Float, Date, ForeignKey, Boolean
from app.database import Base

class Driver(Base):
    """
    Driver master data model.
    """
    __tablename__ = "drivers"

    driver_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    license_no = Column(String(50), unique=True, nullable=False)
    license_expiry = Column(Date, nullable=False)
    phone = Column(String(20), nullable=False)
    home_plant_id = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    status = Column(String(20), default="Active") # Active, Inactive
    current_status = Column(String(20), default="Available") # Available, On-Trip
    is_on_leave = Column(Boolean, default=False)
    rating = Column(Float, default=5.0)

    def __repr__(self):
        """
        String representation of the Driver model.
        """
        return f"<Driver(id={self.driver_id}, name={self.name})>"
