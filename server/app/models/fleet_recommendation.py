"""Fleet recommendation model for multi-plant vehicle repositioning intelligence."""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class FleetRecommendation(Base):
    """
    Stores intelligent vehicle repositioning recommendations.

    Generated automatically when a trip completes — the system evaluates
    whether the vehicle should return to its source plant, move forward
    to another plant with demand, or hold at the current location.
    """

    __tablename__ = "fleet_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String(50), ForeignKey("vehicles.vehicle_id"), nullable=False)
    current_plant_id = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    recommended_plant_id = Column(String(50), ForeignKey("locations.location_id"), nullable=False)
    action = Column(String(30), nullable=False)  # FORWARD_DISPATCH, RETURN, HOLD
    reason = Column(Text, nullable=False)
    score = Column(Float, nullable=False)  # Lower is better
    demand_at_current = Column(Integer, default=0)
    demand_at_recommended = Column(Integer, default=0)
    available_vehicles_at_recommended = Column(Integer, default=0)
    distance_km = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    status = Column(String(20), default="Pending")  # Pending, Accepted, Dismissed, Expired
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ai_summary = Column(Text, nullable=True)

    def __repr__(self):
        return (
            f"<FleetRecommendation(id={self.id}, vehicle={self.vehicle_id}, "
            f"action={self.action}, status={self.status})>"
        )
