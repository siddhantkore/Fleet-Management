# Fleet Management System

A comprehensive, centralized Vehicle Allocation and Logistics Optimization platform designed for multi-plant organizations. Real-time tracking, automated vehicle assignment, compliance alerts, and advanced analytics for fleet operations.

## ✨ Key Features

- 🚚 **Vehicle Management**: Centralized fleet master data with real-time status tracking
- 🗺️ **Live Tracking**: GPS integration with complete path visualization
- 📊 **Trip Optimization**: Intelligent automated vehicle allocation
- ⚠️ **Compliance Alerts**: Proactive notifications for document expiry and maintenance
- 📈 **Dashboard Analytics**: Comprehensive KPI tracking and performance insights
- 🏢 **Multi-Plant Support**: Seamless coordination across multiple locations

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Or: Node.js 18+, Python 3.11+, PostgreSQL 16

### Using Docker Compose
```bash
cd Fleet-Management
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Database: localhost:5432

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 📁 Project Structure

```
Fleet-Management/
├── client/                      # React Frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   └── context/            # Auth context
│   └── package.json
│
├── server/                      # FastAPI Backend (Python 3.11)
│   ├── app/
│   │   ├── models/             # Database models
│   │   ├── routes/             # API endpoints
│   │   ├── schemas/            # Request/response schemas
│   │   └── optimization.py      # Core optimization logic
│   └── requirements.txt
│
├── .github/workflows/           # GitHub Actions CI/CD
│   └── consistency-checks.yml   # Automated quality checks
│
└── docs/                        # Documentation & datasets
```

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Leaflet (Maps) |
| **Backend** | FastAPI, SQLAlchemy, PostGIS |
| **Database** | PostgreSQL 16 + Geographic Extensions |
| **Optimization** | Google OR-Tools |
| **Deployment** | Docker, Docker Compose |

## 👨‍💻 Development

### Code Quality & Standards

The project uses automated consistency checks:

- ✅ **ESLint** - Frontend code style
- ✅ **Black/isort** - Backend code formatting
- ✅ **Flake8** - Python linting
- ✅ **Docker validation** - Container configuration

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

## 📚 Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed installation and configuration
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines
- [CODE_QUALITY.md](CODE_QUALITY.md) - Quick reference for code standards
- [TECHNICAL_DESIGN_DOCUMENT.md](docs/TECHNICAL_DESIGN_DOCUMENT.md) - Architecture details

## 🔄 Version Control Best Practices

1. Create feature branches: `git checkout -b feature/your-feature`
2. Follow commit conventions: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`
3. Run code quality checks locally before pushing
4. Create pull requests with clear descriptions
5. Ensure all GitHub Actions checks pass before merging

## 📝 License

[Your License Here]

## 👥 Contributors

[Contributors list]

## ❓ Support

For issues, questions, or suggestions:
- Check [CODE_QUALITY.md](CODE_QUALITY.md) for common issues
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development help
- Open an issue on GitHub for bug reports

---

**Last Updated**: February 2026
