# Server - Fleet Management System Backend

This directory contains the FastAPI backend for the Fleet Management System.

## Architecture Highlights
- **FastAPI**: Asynchronous web framework for high-performance API endpoints.
- **SQLAlchemy (PostgreSQL)**: ORM for robust data modeling and transaction management.
- **Google OR-Tools**: Constraint programming (CP-SAT) solver used for optimizing vehicle assignments and post-trip repositioning.
- **WebSockets**: Real-time GPS telemetry broadcasting.

## Routers & Endpoints

The API is mounted at `/api/v1` and is divided into the following routers:

- **Auth** (`routes/auth.py`): User login and registration (`/user/login`, `/user/signup`).
- **Drivers** (`routes/driver.py`): Driver CRUD operations.
- **Vehicles** (`routes/vehicle.py`): Vehicle CRUD operations.
- **Locations** (`routes/location.py`): Plant and warehouse CRUD operations.
- **Trips** (`routes/trip.py`): Trip scheduling, overlap detection, status updates.
- **Routes** (`routes/route.py`): Multi-route generation via OpenRouteService and scoring.
- **Tracking** (`routes/tracking.py`): GPS ingestion, WebSockets (`/tracking/ws`), trip progress, and resource analysis.
- **Reports** (`routes/reports.py`): Filterable aggregate data and CSV export endpoints.
- **Analysis** (`routes/analysis.py`): LLM-driven insights for route comparisons and trip summaries (using Groq/Ollama).
- **Fleet Intelligence** (`routes/fleet_intelligence.py`): Vehicle repositioning recommendations and AI explanations.

## Running Locally

1. Create and activate a Python virtual environment:
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

## Environment Variables
The following environment variables should be defined in a `.env` file inside the `server/` directory:
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET_KEY`
- `OPENROUTESERVICE_API_KEY`
- `GROQ_API_KEY` (Optional, for AI summaries)
- `LLM_PROVIDER` (e.g., "groq" or "ollama")

*(Refer to `../SETUP_GUIDE.md` for full configuration details).*

## Testing
We use `pytest` for unit and integration testing. Run `pytest` from this directory to execute the test suite.
