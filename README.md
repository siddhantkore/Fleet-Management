# Fleet Management System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

A comprehensive, centralized Vehicle Allocation and Logistics Optimization platform designed for multi-plant organizations. Features real-time tracking, automated vehicle assignment, compliance alerts, advanced analytics, and AI-powered fleet intelligence for operations.

## Key Features

- **Vehicle & Driver Management**: Centralized fleet master data with real-time status tracking and CRUD operations.
- **Live Tracking**: GPS integration with complete path visualization, telemetry (Speed, Heading, Altitude, Battery), and active trip routes.
- **Trip Optimization**: Intelligent automated vehicle allocation considering load capacity, density, and driver availability.
- **Route Analysis**: OpenRouteService (ORS) integration for optimal and alternative road geometries, including long-distance fallback mechanisms.
- **Fleet Intelligence**: AI-powered repositioning recommendations based on demand, distance, and fleet availability across plants.
- **Multi-Plant Support**: Seamless coordination across multiple locations with Nominatim geocoding and map-based search.
- **Dashboard Analytics**: Comprehensive KPI tracking, performance insights, and notification centers.

## Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Or: Node.js 18+, Python 3.11+, PostgreSQL 16

### Using Docker Compose
```bash
# Clone the repository and navigate into it
cd Fleet-Management

# Build and start the containers
docker-compose up -d --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Database: localhost:5432

For detailed setup instructions and environment variable configuration, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Project Structure

```
Fleet-Management/
├── client/                      # React Frontend (Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components (Dashboard, Tracking, etc.)
│   │   ├── services/            # API integration
│   │   └── context/             # App state contexts
│   └── package.json
│
├── server/                      # FastAPI Backend (Python 3.11)
│   ├── app/
│   │   ├── llm/                 # LLM Integration (Groq/Ollama for AI summaries)
│   │   ├── models/              # Database schema models
│   │   ├── routes/              # API endpoints
│   │   ├── schemas/             # Pydantic validation schemas
│   │   └── optimization_engine/ # Routing and allocation logic (OR-Tools, ORS)
│   └── requirements.txt
│
├── .github/workflows/           # GitHub Actions CI/CD
│   └── consistency-checks.yml   # Automated quality checks
│
└── docs/                        # Documentation & Architecture
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Leaflet (Maps) |
| **Backend** | FastAPI, SQLAlchemy, PostGIS |
| **Database** | PostgreSQL 16 + Geographic Extensions |
| **Optimization** | Google OR-Tools, OpenRouteService (ORS) |
| **AI/LLM** | Groq, Ollama (Local) |
| **Deployment** | Docker, Docker Compose |

## Development

### Code Quality & Standards

The project uses automated consistency checks:

- **ESLint** - Frontend code style
- **Black/isort** - Backend code formatting
- **Flake8** - Python linting
- **Docker validation** - Container configuration

See [CODE_QUALITY.md](CODE_QUALITY.md) for quick reference and [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Before Committing

```bash
# Frontend
cd client
npm run lint -- --fix

# Backend
cd server
black app/
isort app/
flake8 app/
```

### GitHub Actions Workflow

Automated checks run on every push and PR:

1. **Frontend Lint & Build** - ESLint and build verification
2. **Backend Checks** - Python formatting and linting
3. **Dependency Security** - npm and pip vulnerability scans
4. **Consistency Checks** - Import consistency, trailing whitespace
5. **Docker Validation** - docker-compose and Dockerfile builds

See [.github/workflows/README.md](.github/workflows/README.md) for details.

## Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed installation and configuration
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines
- [CODE_QUALITY.md](CODE_QUALITY.md) - Quick reference for code standards
- [TECHNICAL_DESIGN_DOCUMENT.md](docs/TECHNICAL_DESIGN_DOCUMENT.md) - Architecture details
- [MULTI_PLANT_LOGISTICS.md](docs/MULTI_PLANT_LOGISTICS.md) - Multi-plant logistics overview

## Version Control Best Practices

1. Create feature branches: `git checkout -b feature/your-feature`
2. Follow commit conventions: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`
3. Run code quality checks locally before pushing
4. Create pull requests with clear descriptions
5. Ensure all GitHub Actions checks pass before merging
