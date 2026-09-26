# Fleet Management System - Developer Guide

This document provides a comprehensive guide to the architecture, database schema, APIs, and development setup for the Fleet Management System (WS5).

## 1. Architecture Overview

The system is built as a monorepo containing a full-stack application for managing, tracking, and optimizing fleet operations across multiple plants.

- **Monorepo Structure**: Isolated backend (`server/`) and frontend (`client/`) directories.
- **Backend API**: Python 3.11 with FastAPI for high-performance async REST APIs.
- **Frontend**: React 19 + Vite with React Router v6 for a dynamic, client-side routed SPA.
- **Database**: PostgreSQL 16 managed via SQLAlchemy ORM.
- **Real-time Tracking**: WebSocket connections providing live GPS updates to the client.
- **Optimization Engine**: Google OR-Tools (CP-SAT solver) handles constraint programming for vehicle/driver assignment. OpenRouteService provides routing geometries and alternatives.
- **AI/LLM Integration**: Groq (cloud) and Ollama (local) to generate human-readable insights for route comparisons and fleet intelligence. *(Note: AI is NOT used for mathematical optimization).*

## 2. Tech Stack Details

**Backend**
- **Language**: Python 3.11
- **Framework**: FastAPI, uvicorn
- **ORM & DB**: SQLAlchemy, asyncpg/psycopg2, PostgreSQL 16
- **Validation**: Pydantic
- **Optimization**: Google OR-Tools
- **Auth**: JWT (PyJWT, PassLib)

**Frontend**
- **Framework**: React 19, Vite
- **Routing**: react-router-dom v6
- **State/API**: axios (centralized at `api.js`), Context API (`AuthContext`)
- **Maps**: Leaflet, react-leaflet (OpenStreetMap/Esri/Carto base maps)

**External Services**
- **Routing**: OpenRouteService API
- **LLM**: Groq API / local Ollama

## 3. Project Structure

```text
Fleet-Management/
├── server/                    # FastAPI backend
│   ├── main.py               # App entry point, middleware, route registration
│   ├── app/
│   │   ├── config.py         # Environment configuration
│   │   ├── database.py       # SQLAlchemy session setup
│   │   ├── auth.py           # JWT authentication
│   │   ├── models/           # SQLAlchemy ORM models
│   │   │   ├── driver.py     # Driver master data
│   │   │   ├── vehicle.py    # Vehicle master data
│   │   │   ├── location.py   # Plant/warehouse locations
│   │   │   ├── trip.py       # Trip planning & tracking
│   │   │   ├── tracking.py   # LiveLocation real-time GPS
│   │   │   ├── maintenance.py # Vehicle maintenance logs
│   │   │   └── fleet_recommendation.py # Repositioning suggestions
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routes/           # API endpoint routers
│   │   │   ├── trip.py       # Trip CRUD + scheduling
│   │   │   ├── route.py      # Route optimization
│   │   │   ├── tracking.py   # GPS tracking + WebSocket + resource analysis
│   │   │   ├── reports.py    # Filterable reports + CSV export
│   │   │   ├── analysis.py   # AI-powered summaries
│   │   │   ├── fleet_intelligence.py # Vehicle repositioning
│   │   │   └── ... 
│   │   ├── optimization_engine/
│   │   │   ├── planner.py    # Main trip optimization orchestrator
│   │   │   ├── solver.py     # OR-Tools CP-SAT vehicle+driver assignment
│   │   │   ├── route_optimizer.py # ORS multi-route fetching + scoring
│   │   │   ├── route_provider.py  # Haversine/ORS distance estimation
│   │   │   ├── data_provider.py   # DB queries for eligible resources
│   │   │   ├── fleet_intelligence.py # Post-trip repositioning logic
│   │   │   └── types.py      # Shared dataclasses
│   │   └── llm/              # LLM provider abstraction
│   │       ├── factory.py    # Provider selection
│   │       ├── groq_provider.py
│   │       └── ollama_provider.py
│   └── requirements.txt
├── client/                   # React frontend
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Root router
│   ├── src/
│   │   ├── pages/           # Full page components
│   │   ├── services/api.js  # Centralized axios instance
│   │   ├── context/AuthContext.jsx # JWT auth context
│   │   └── components/      # Reusable components
│   └── package.json
├── docker-compose.yml        # 3-service orchestration (db, backend, frontend)
├── simulate_tracking.py      # GPS tracking simulator
└── docs/                     # Technical documentation
```

## 4. API Reference

All backend APIs are prefixed with `/api/v1`.

### Authentication
- `POST /api/v1/user/signup`: Register new user
- `POST /api/v1/user/login`: Authenticate and receive JWT

### Master Data (Drivers, Vehicles, Locations)
- `GET/POST /api/v1/drivers`: List/Create drivers
- `GET/PUT/DELETE /api/v1/drivers/{id}`: Manage specific driver
- `GET/POST /api/v1/vehicles`: List/Create vehicles
- `GET/PUT/DELETE /api/v1/vehicles/{id}`: Manage specific vehicle
- `GET/POST /api/v1/locations`: List/Create locations (plants/warehouses)
- `GET/PUT/DELETE /api/v1/locations/{id}`: Manage specific location

### Trip Management
- `POST /api/v1/trips/schedule`: Schedule a new trip (triggers overlap detection)
- `GET /api/v1/trips`: List trips
- `GET /api/v1/trips/{id}`: Get trip details
- `POST /api/v1/trips/{id}/start`: Mark trip as started
- `POST /api/v1/trips/{id}/complete`: Mark trip as completed

### Routing
- `POST /api/v1/routes/optimize`: Generate and optimize route alternatives
- `GET /api/v1/routes/trip/{trip_id}`: Fetch stored routes for a trip

### Tracking & Telemetry
- `POST /api/v1/tracking/owntracks/{driver_id}`: Webhook for OwnTracks GPS data
- `GET /api/v1/tracking/locations`: Get latest known locations
- `GET /api/v1/tracking/driver-detail/{driver_id}`: Telemetry history for driver
- `GET /api/v1/tracking/trip-progress/{trip_id}`: Real-time progress against route
- `GET /api/v1/tracking/resource-analysis`: Resource availability dashboard
- `PUT /api/v1/tracking/resource/driver/{driver_id}/location`: Update driver location
- `WS /api/v1/tracking/ws`: WebSocket endpoint for real-time dashboard updates

### Reports
- `GET /api/v1/reports/trips`: Trip data with filters
- `GET /api/v1/reports/vehicles`: Vehicle utilization reports
- `GET /api/v1/reports/drivers`: Driver hours/performance reports
- `GET /api/v1/reports/plants`: Plant volume reports
- `GET /api/v1/reports/costs`: Operations cost reports
- `GET /api/v1/reports/export/{type}`: Export reports to CSV

### Analysis & AI
- `POST /api/v1/analysis/trip-summary`: LLM-generated trip narrative
- `POST /api/v1/analysis/route-comparison`: LLM-generated route comparison
- `POST /api/v1/analysis/general`: Generic analysis prompt
- `GET /api/v1/analysis/cargo-categories`: Fetch allowed cargo categories

### Fleet Intelligence
- `GET /api/v1/fleet/recommendations`: Retrieve active repositioning recommendations
- `POST /api/v1/fleet/recommendations/{id}/accept`: Apply recommendation
- `POST /api/v1/fleet/recommendations/{id}/dismiss`: Dismiss recommendation
- `POST /api/v1/fleet/recommendations/{id}/explain`: Use LLM to explain recommendation logic

## 5. Database Schema (PostgreSQL via SQLAlchemy)

- **User**: `id`, `email`, `hashed_password`, `role`, `created_at`
- **Location**: `id`, `name`, `address`, `latitude`, `longitude`, `type`
- **Vehicle**: `id`, `registration_number`, `type`, `capacity`, `status`, `current_location_id`
- **Driver**: `id`, `name`, `license_number`, `status`, `current_location_id`, `assigned_vehicle_id`
- **Trip**: `id`, `source_id`, `destination_id`, `vehicle_id`, `driver_id`, `status`, `scheduled_start`, `scheduled_end`, `cargo_type`, `cargo_weight`
- **Route**: `id`, `trip_id`, `geometry`, `distance_km`, `duration_mins`, `is_selected`
- **LiveLocation**: `id`, `driver_id`, `trip_id`, `latitude`, `longitude`, `speed`, `timestamp`
- **MaintenanceLog**: `id`, `vehicle_id`, `description`, `cost`, `date`
- **FleetRecommendation**: `id`, `vehicle_id`, `trip_id`, `target_location_id`, `action`, `status`, `reason`

## 6. Optimization Engine

The backend relies on a multi-stage optimization pipeline:
1. **Route Alternatives**: OpenRouteService fetches multiple paths between source and destination.
2. **Scoring**: A composite cost function evaluates distance, duration, fuel cost, and elevation data to score routes.
3. **Vehicle/Driver Assignment**: Google OR-Tools (CP-SAT) evaluates resource availability, constraints (capacity, license type), and minimizes deadhead miles to assign vehicles and drivers optimally.
4. **Schedule Overlap Detection**: Ensures double-booking does not occur during scheduling.
5. **Fleet Intelligence**: Post-trip logic uses OR-Tools to recommend returning a vehicle to its home plant versus repositioning it to an in-demand location.

## 7. Development Setup

### Docker Setup (Recommended)
```bash
docker-compose up --build
```
This launches PostgreSQL, the FastAPI server, and the Vite frontend.

### Manual Setup
1. **Database**: Install PostgreSQL, create a database named `fleet_db`.
2. **Backend**:
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

### Running the Simulator
To test live tracking and WebSocket events:
```bash
python simulate_tracking.py
```

## 8. Testing

- **Backend Testing**: pytest framework is configured. Use `pytest` in the `server/` directory.
- **Frontend Testing**: Not currently configured, but React Testing Library / Jest can be added to the Vite pipeline.
