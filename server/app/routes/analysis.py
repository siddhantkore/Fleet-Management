"""AI-powered analysis endpoints for trip summaries and recommendations.

The AI is used ONLY for generating human-readable summaries and explanations.
All optimization decisions are made by OR-Tools (deterministic algorithms).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.llm.factory import get_llm_provider
from app.models.trip import Trip
from app.models.user import User
from app.schemas.trip import CARGO_CATEGORIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

SYSTEM_PROMPT = (
    "You are a logistics analyst for a fleet management system. "
    "Provide concise, professional analysis of vehicle dispatch decisions. "
    "Focus on practical insights: cost efficiency, fuel consumption, "
    "vehicle suitability, and route selection rationale. "
    "Use bullet points and keep responses under 300 words. "
    "Do NOT make up data — only analyze what is provided."
)


class TripSummaryRequest(BaseModel):
    trip_id: str


class RouteComparisonRequest(BaseModel):
    optimization_summary: str
    route_data: str | None = None


class GeneralAnalysisRequest(BaseModel):
    context: str
    question: str


@router.post("/trip-summary")
async def generate_trip_summary(
    request: TripSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an AI-enhanced summary for a specific trip."""
    trip = db.query(Trip).filter(Trip.trip_id == request.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not trip.summary:
        raise HTTPException(status_code=400, detail="Trip has no optimization summary to analyze")

    prompt = (
        f"Analyze this fleet optimization decision and provide insights:\n\n"
        f"{trip.summary}\n\n"
        f"Provide:\n"
        f"1. Why this vehicle was chosen (efficiency, suitability)\n"
        f"2. Route selection rationale\n"
        f"3. Cost analysis\n"
        f"4. Alternative suggestions if applicable"
    )

    try:
        llm = get_llm_provider()
        ai_response = await llm.generate(prompt, SYSTEM_PROMPT)
        return {
            "trip_id": request.trip_id,
            "ai_summary": ai_response,
            "provider": llm.name(),
        }
    except Exception as exc:
        logger.error(f"LLM generation failed: {exc}")
        return {
            "trip_id": request.trip_id,
            "ai_summary": f"[AI analysis unavailable: {exc}]",
            "provider": "error",
        }


@router.post("/route-comparison")
async def analyze_route_comparison(
    request: RouteComparisonRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate AI analysis comparing multiple route alternatives."""
    prompt = (
        f"Analyze the following route optimization result and explain "
        f"why the selected route is optimal:\n\n"
        f"{request.optimization_summary}\n\n"
    )
    if request.route_data:
        prompt += f"Route data (JSON): {request.route_data}\n\n"

    prompt += (
        "Provide:\n"
        "1. Why the selected route is best\n"
        "2. When might an alternative route be preferred\n"
        "3. Impact on fuel costs and delivery time"
    )

    try:
        llm = get_llm_provider()
        ai_response = await llm.generate(prompt, SYSTEM_PROMPT)
        return {
            "ai_analysis": ai_response,
            "provider": llm.name(),
        }
    except Exception as exc:
        logger.error(f"LLM route analysis failed: {exc}")
        return {
            "ai_analysis": f"[AI analysis unavailable: {exc}]",
            "provider": "error",
        }


@router.post("/general")
async def general_analysis(
    request: GeneralAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    """General-purpose AI analysis endpoint for fleet management questions."""
    prompt = f"Context:\n{request.context}\n\nQuestion: {request.question}"

    try:
        llm = get_llm_provider()
        ai_response = await llm.generate(prompt, SYSTEM_PROMPT)
        return {
            "answer": ai_response,
            "provider": llm.name(),
        }
    except Exception as exc:
        logger.error(f"LLM general analysis failed: {exc}")
        return {
            "answer": f"[AI analysis unavailable: {exc}]",
            "provider": "error",
        }


@router.get("/cargo-categories")
async def get_cargo_categories(
    current_user: User = Depends(get_current_user),
):
    """Return the list of predefined cargo categories."""
    return {"categories": CARGO_CATEGORIES}
