from sqlalchemy import Column, String, Float
from app.database import Base

class Location(Base):
    """
    Location/Plant master data model.
    """
    __tablename__ = "locations"

    location_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # Plant, Warehouse, etc.
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city = Column(String(100), nullable=False)

    def __repr__(self):
        """
        String representation of the Location model.
        """
        return f"<Location(id={self.location_id}, name={self.name})>"
