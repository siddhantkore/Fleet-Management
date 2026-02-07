"""
Fleet Management System - Main Application Entry Point

This is the entry point for the FastAPI application.
It initializes the app, configures middleware, and registers all routes.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import API_TITLE, API_DESCRIPTION, API_VERSION, DEBUG, LOG_LEVEL
from app.database import init_db
from app.routes import status, contact, tracking, user, driver, location

# Configure logging
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== APPLICATION SETUP ====================

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        FastAPI: Configured application instance
    """
    app = FastAPI(
        title=API_TITLE,
        description=API_DESCRIPTION,
        version=API_VERSION,
        docs_url="/docs",  # Swagger UI
        redoc_url="/redoc",  # ReDoc
        openapi_url="/openapi.json"
    )

    # ==================== MIDDLEWARE ====================

    # Add CORS middleware for frontend communication
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # TODO: In production, specify exact origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ==================== DATABASE INITIALIZATION ====================

    @app.on_event("startup")
    async def startup_event():
        """Initialize database on application startup"""
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully")

    # ==================== ROUTE REGISTRATION ====================

    # Include status routes (root, health check)
    app.include_router(status.router, prefix="/api/v1")

    # Include contact routes
    app.include_router(contact.router, prefix="/api/v1")

    # Include tracking routes
    app.include_router(tracking.router, prefix="/api/v1")

    # Include user/auth routes
    app.include_router(user.router, prefix="/api/v1")

    # Include driver routes
    app.include_router(driver.router, prefix="/api/v1")

    # Include location/plant routes
    app.include_router(location.router, prefix="/api/v1")

    logger.info(f"Application '{API_TITLE}' started successfully")
    return app


# Create the application instance
app = create_app()


# ==================== DEVELOPMENT ENTRY POINT ====================

if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting development server on 0.0.0.0:8000")
    logger.info(f"API Documentation available at http://0.0.0.0:8000/docs")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level=LOG_LEVEL.lower()
    )