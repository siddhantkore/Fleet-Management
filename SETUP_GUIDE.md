# Fleet Management System - Setup Guide

This guide covers configuring and launching the Fleet Management System.

## Prerequisites
- **Docker & Docker Compose** (Recommended)
- **Node.js** (v18+, if running manually)
- **Python** (v3.11+, if running manually)
- **PostgreSQL** (v16+, if running manually)

## 1. Environment Configuration

You will need an OpenRouteService API key and an optional Groq API key (for AI text features). 

### Backend `.env`
Create a file at `server/.env` and add the following:

```env
# Database
DATABASE_URL=postgresql://user:password@db:5432/fleet_db # Use localhost if running manually

# Authentication
JWT_SECRET_KEY=your_super_secret_jwt_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Routing & Optimization
OPENROUTESERVICE_API_KEY=your_ors_api_key

# AI/LLM Integration (Optional but recommended)
LLM_PROVIDER=groq  # or 'ollama' for local inference
GROQ_API_KEY=your_groq_api_key
OLLAMA_BASE_URL=http://localhost:11434 # if using local ollama
```

### Frontend `.env`
Create a file at `client/.env` and add the following:

```env
# API Connectivity
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1
```

## 2. Launch via Docker (Recommended)

From the root `Fleet-Management` directory, simply run:

```bash
docker-compose up --build
```

This will bring up:
- **db**: PostgreSQL instance mapping to port `5432`
- **server**: FastAPI backend mapping to port `8000`
- **client**: React/Vite frontend mapping to port `5173`

Once running, access the UI at `http://localhost:5173`.

## 3. Launch Manually

If you prefer to run the services directly on your host machine:

### Setup Database
Ensure PostgreSQL is running and create a database:
```sql
CREATE DATABASE fleet_db;
```
*(Update `DATABASE_URL` in `server/.env` to reflect your local postgres credentials).*

### Setup Backend
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Setup Frontend
```bash
cd client
npm install
npm run dev
```

## 4. Running the Telemetry Simulator
To test live tracking out of the box, you can use the built-in tracking simulator script. While the backend is running, open a new terminal:

```bash
cd Fleet-Management
python simulate_tracking.py
```
This script will push mock GPS coordinates to the `/api/v1/tracking/owntracks` webhook, which in turn broadcasts them over WebSockets to your frontend UI.
