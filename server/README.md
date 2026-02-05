# Fleet Management Backend - FastAPI Server

## 🏗️ Project Structure

```
server/
├── main.py                    # Application entry point
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container configuration
├── .env                       # Environment variables
├── .env.example              # Example environment file
├── .dockerignore             # Docker ignore patterns
├── STRUCTURE.md              # Detailed structure documentation
│
├── app/                       # Main application package
│   ├── __init__.py           # Package initialization
│   ├── config.py             # Configuration management
│   ├── database.py           # Database setup & sessions
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic validation schemas
│   ├── utils.py              # Utility functions
│   │
│   └── routes/               # API endpoint handlers
│       ├── __init__.py       # Package initialization
│       ├── status.py         # Health check & status endpoints
│       └── contact.py        # Contact submission endpoints
│
└── tests/                     # Test suite (future)
    ├── __init__.py
    ├── conftest.py           # Pytest configuration
    └── test_*.py             # Test files
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 16 (or use Docker)

### Local Development

1. **Create Virtual Environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Setup Environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Run Application**
```bash
python main.py
# Or with auto-reload:
uvicorn main:app --reload
```

5. **Access API**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Docker Setup

```bash
docker-compose up --build
```

---

## 📦 Module Guide

### `main.py` - Application Entry Point
- Creates and configures FastAPI app
- Registers middleware (CORS)
- Initializes database on startup
- Includes all route modules

### `app/config.py` - Configuration
- Centralized environment settings
- Database URL
- API metadata
- Debug and logging settings

### `app/database.py` - Database Management
- SQLAlchemy engine configuration
- Session factory
- ORM base class
- Database initialization
- Session dependency injection

### `app/models.py` - Data Models
- SQLAlchemy ORM models
- `ContactSubmission` - Current implementation
- Template models for Phase 2 features

### `app/schemas.py` - Data Validation
- Pydantic request/response models
- Input validation
- API documentation examples
- Email validation

### `app/routes/` - API Endpoints

#### `status.py`
- `GET /` - Server status
- `GET /health` - Database health check

#### `contact.py`
- `POST /api/contact` - Create submission
- `GET /api/contact` - List submissions
- `GET /api/contact/{id}` - Get specific submission
- `DELETE /api/contact/{id}` - Delete submission

### `app/utils.py` - Utility Functions
- Common helper functions
- Formatting utilities
- Logging helpers

---

## 🔌 API Endpoints

### Status Endpoints
```bash
# Server status
curl http://localhost:8000/

# Health check
curl http://localhost:8000/health
```

### Contact Endpoints
```bash
# Create contact
curl -X POST http://localhost:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "subject": "Fleet Inquiry",
    "message": "I am interested in your services"
  }'

# List all contacts
curl http://localhost:8000/api/contact

# Get specific contact
curl http://localhost:8000/api/contact/1

# Delete contact
curl -X DELETE http://localhost:8000/api/contact/1
```

---

## 📊 Database

### Tables

#### `contact_submissions`
- `id` (INT, PK) - Auto-incremented ID
- `name` (VARCHAR 255) - Contact name
- `email` (VARCHAR 255) - Email address
- `phone` (VARCHAR 20) - Phone number
- `subject` (VARCHAR 500) - Subject line
- `message` (TEXT) - Message content
- `created_at` (TIMESTAMP) - Creation timestamp

### Schema Ready for Phase 2
- `vehicles` - Fleet vehicle data
- `drivers` - Driver information  
- `locations` - Plant locations
- `trips` - Trip tracking
- `maintenance` - Service records

---

## 🔒 Security

### Current
✅ CORS enabled  
✅ Pydantic validation  
✅ SQLAlchemy ORM protection  
✅ Email validation  

### Production Checklist
- [ ] Restrict CORS origins
- [ ] Add authentication
- [ ] Add rate limiting
- [ ] Enable HTTPS/TLS
- [ ] Add request logging
- [ ] Implement secrets management
- [ ] Add API key validation
- [ ] Database encryption

---

## 🧪 Testing

Test framework is ready for implementation:

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_contact.py

# Run with coverage
pytest --cov=app --cov-report=html
```

---

## 📝 Adding New Features

### Example: Add a Vehicle Endpoint

1. **Add Model** (`app/models.py`):
```python
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    # ... fields ...
```

2. **Add Schemas** (`app/schemas.py`):
```python
class VehicleCreate(BaseModel):
    # ... fields ...

class VehicleResponse(VehicleCreate):
    id: int
```

3. **Create Routes** (`app/routes/vehicle.py`):
```python
from fastapi import APIRouter
router = APIRouter(prefix="/api/vehicle", tags=["vehicle"])

@router.post("", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    # implementation
```

4. **Register Routes** (`main.py`):
```python
from app.routes import vehicle
app.include_router(vehicle.router)
```

---

## 📚 Documentation

### Detailed Documentation
- [Project Structure Guide](./STRUCTURE.md) - In-depth structure explanation
- [Requirements](../docs/REQUIREMENTS.md) - System requirements
- [Technical Design](../docs/TECHNICAL_DESIGN_DOCUMENT.md) - Architecture
- [Data Schema](../docs/DATA.md) - Data models

### API Documentation (When Running)
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U fleet_user -h localhost -d fleet_management

# Check environment variables
cat .env

# Check Docker logs
docker-compose logs db
```

### Import Errors
```bash
# Verify virtual environment is active
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Port Already in Use
```bash
# Find process on port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

---

## 📦 Dependencies

### Core
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **sqlalchemy** - ORM
- **psycopg2-binary** - PostgreSQL adapter
- **pydantic** - Data validation

### Security
- **python-jose** - JWT tokens
- **passlib** - Password hashing
- **cryptography** - Encryption

### Development
- **pytest** - Testing
- **black** - Code formatting
- **flake8** - Linting

See [requirements.txt](./requirements.txt) for complete list.

---

## 🎯 Next Steps

### Phase 1 (Current) ✅
- [x] FastAPI server setup
- [x] PostgreSQL integration
- [x] Contact form backend
- [x] Structured project layout
- [x] Docker support

### Phase 2 (Planned)
- [ ] Vehicle management endpoints
- [ ] Driver management endpoints
- [ ] Trip planning endpoints
- [ ] Maintenance tracking

### Phase 3 (Planned)
- [ ] Optimization engine integration
- [ ] Real-time GPS tracking
- [ ] Compliance alerts
- [ ] KPI dashboard

---

## 🔗 Related Files

- Frontend: `../client/` - React application
- Documentation: `../docs/` - System requirements
- Docker Setup: `../docker-compose.yml`

---

**Last Updated**: February 5, 2026  
**Version**: 1.0.0
