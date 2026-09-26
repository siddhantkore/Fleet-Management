# Fleet Management System

A comprehensive, real-time fleet management and multi-plant optimization platform. 

This system handles everything from trip scheduling and live GPS tracking to AI-powered insights and operations optimization using constraint programming (Google OR-Tools) and OpenRouteService.

## Key Features

- **Multi-Plant Fleet Optimization**: Intelligent vehicle and driver assignment using Google OR-Tools CP-SAT solver, preventing schedule overlaps and minimizing deadhead costs.
- **Real-Time GPS Tracking**: Live vehicle tracking over WebSockets, displaying progress against planned routes.
- **Route Analysis**: OpenRouteService integration for generating and scoring multiple route alternatives (distance, elevation, fuel), augmented with AI-generated narrative summaries.
- **Trip Management**: End-to-end trip lifecycle management, scheduling, and execution tracking.
- **Fleet Intelligence**: Smart, post-trip vehicle repositioning recommendations (return vs reposition) based on predictive plant demand.
- **Comprehensive Reports**: Filterable data grids for trips, vehicles, drivers, and costs, featuring one-click CSV exports.
- **Resource Analysis**: Macro-level dashboard for managing and analyzing driver and vehicle distributions across various locations.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy (PostgreSQL)
- **Frontend**: React 19, Vite, React Router v6, Leaflet/react-leaflet
- **Algorithms**: Google OR-Tools (CP-SAT), Haversine heuristics
- **Integrations**: OpenRouteService (Routing), Groq / Ollama (AI/LLMs)
- **Infrastructure**: Docker, Docker Compose

## Quick Start (Docker)

Ensure Docker and Docker Compose are installed.

1. Clone the repository
2. Set up environment variables (see `SETUP_GUIDE.md`)
3. Build and launch all services:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: `http://localhost:5173`
   - Backend API Docs: `http://localhost:8000/docs`

## Documentation

For a deep dive into the architecture, database schemas, and API references, see the Developer Guide:

👉 **[DEVELOPERS.md](DEVELOPERS.md)**

## Setup Guide

For step-by-step instructions on setting up environment variables and running the system manually without Docker, see:

👉 **[SETUP_GUIDE.md](SETUP_GUIDE.md)**
