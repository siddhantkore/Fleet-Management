from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, Text

from app.database import Base


class Maintenance(Base):
    """
    Maintenance records model.
    """

    __tablename__ = "maintenance"

    maint_id = Column(String(50), primary_key=True, index=True)
    vehicle_id = Column(String(50), ForeignKey("vehicles.vehicle_id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(50), nullable=False)  # Preventive, Breakdown, Tire, etc.
    cost = Column(Float, nullable=False)
    odometer_reading = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)

    def __repr__(self):
        """
        String representation of the Maintenance model.
        """
        return f"<Maintenance(id={self.maint_id}, vehicle_id={self.vehicle_id})>"
