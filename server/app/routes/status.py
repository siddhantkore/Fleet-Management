"""
Health and status check routes.
Provides system health information and connectivity checks.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import API_VERSION
from app.schemas import HealthCheckResponse, StatusResponse

# Create router for status endpoints
router = APIRouter(
    tags=["status"],
    responses={500: {"description": "Internal server error"}}
)


@router.get("/", response_model=StatusResponse)
def read_root():
    """
    Root endpoint that returns server status and information.
    
    Returns:
        - message: Status message
        - status: Server operational status
        - api_version: Current API version
    """
    return {
        "message": "Fleet Management Server is running...",
        "status": "operational",
        "api_version": API_VERSION
    }


@router.get("/health", response_model=HealthCheckResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint that verifies database connectivity.
    
    This endpoint is used by:
    - Load balancers to check service health
    - Container orchestration systems (Docker, Kubernetes)
    - Monitoring systems
    
    Returns:
        - status: "healthy" if server is operational
        - database: "connected" if database connection is valid
    
    Raises:
        HTTPException: 500 if database connection fails
    """
    try:
        # Execute simple query to verify connection
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )
