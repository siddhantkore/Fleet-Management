"""Fleet Intelligence API — vehicle repositioning recommendations."""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.llm.factory import get_llm_provider
from app.models.fleet_recommendation import FleetRecommendation
from app.models.location import Location
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fleet", tags=["fleet-intelligence"])


class RecommendationResponse(BaseModel):
    id: int
    vehicle_id: str
    current_plant_id: str
    current_plant_name: str | None = None
    recommended_plant_id: str
    recommended_plant_name: str | None = None
    action: str
    reason: str
    score: float
    demand_at_current: int
    demand_at_recommended: int
    available_vehicles_at_recommended: int
    distance_km: float
    estimated_cost: float
    status: str
    created_at: str | None = None
    ai_summary: str | None = None


@router.get("/recommendations", response_model=List[RecommendationResponse])
def get_recommendations(
    status: str = "Pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get fleet repositioning recommendations."""
    recs = (
        db.query(FleetRecommendation)
        .filter(FleetRecommendation.status == status)
        .order_by(FleetRecommendation.created_at.desc())
        .all()
    )

    # Resolve plant names
    location_ids = set()
    for r in recs:
        location_ids.add(r.current_plant_id)
        location_ids.add(r.recommended_plant_id)

    locations = {
        loc.location_id: loc.name
        for loc in db.query(Location).filter(
            Location.location_id.in_(list(location_ids))
        ).all()
    }

    results = []
    for r in recs:
        results.append(RecommendationResponse(
            id=r.id,
            vehicle_id=r.vehicle_id,
            current_plant_id=r.current_plant_id,
            current_plant_name=locations.get(r.current_plant_id),
            recommended_plant_id=r.recommended_plant_id,
            recommended_plant_name=locations.get(r.recommended_plant_id),
            action=r.action,
            reason=r.reason,
            score=r.score,
            demand_at_current=r.demand_at_current or 0,
            demand_at_recommended=r.demand_at_recommended or 0,
            available_vehicles_at_recommended=r.available_vehicles_at_recommended or 0,
            distance_km=r.distance_km,
            estimated_cost=r.estimated_cost,
            status=r.status,
            created_at=r.created_at.isoformat() if r.created_at else None,
            ai_summary=r.ai_summary,
        ))

    return results


@router.get("/recommendations/count")
def get_recommendation_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of pending recommendations (for dashboard badge)."""
    count = (
        db.query(FleetRecommendation)
        .filter(FleetRecommendation.status == "Pending")
        .count()
    )
    return {"count": count}


@router.post("/recommendations/{rec_id}/accept")
def accept_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept a fleet repositioning recommendation."""
    rec = db.query(FleetRecommendation).filter(FleetRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "Accepted"
    db.commit()
    return {"message": "Recommendation accepted", "id": rec_id}


@router.post("/recommendations/{rec_id}/dismiss")
def dismiss_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss a fleet repositioning recommendation."""
    rec = db.query(FleetRecommendation).filter(FleetRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "Dismissed"
    db.commit()
    return {"message": "Recommendation dismissed", "id": rec_id}


@router.post("/recommendations/{rec_id}/explain")
async def explain_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an AI explanation for a specific recommendation."""
    rec = db.query(FleetRecommendation).filter(FleetRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    prompt = (
        f"Explain this fleet vehicle repositioning decision to a logistics manager:\n\n"
        f"Vehicle: {rec.vehicle_id}\n"
        f"Current location: {rec.current_plant_id}\n"
        f"Recommended action: {rec.action}\n"
        f"Recommended destination: {rec.recommended_plant_id}\n"
        f"Distance: {rec.distance_km} km\n"
        f"Estimated cost: ₹{rec.estimated_cost}\n"
        f"Demand at current: {rec.demand_at_current} trips\n"
        f"Demand at recommended: {rec.demand_at_recommended} trips\n"
        f"Available vehicles at recommended: {rec.available_vehicles_at_recommended}\n"
        f"Algorithm reason: {rec.reason}\n\n"
        f"Provide a clear business justification in 3-4 bullet points."
    )

    try:
        llm = get_llm_provider()
        ai_summary = await llm.generate(
            prompt,
            "You are a logistics analyst. Explain fleet decisions clearly and concisely."
        )
        rec.ai_summary = ai_summary
        db.commit()
        return {"ai_summary": ai_summary, "provider": llm.name()}
    except Exception as exc:
        logger.error(f"LLM explanation failed: {exc}")
        return {"ai_summary": f"[AI explanation unavailable: {exc}]", "provider": "error"}
