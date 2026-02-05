# Backend Project Structure

## Directory Overview

```
server/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── .env                   # Environment variables
├── .dockerignore          # Docker ignore patterns
│
└── app/                   # Main application package
    ├── __init__.py        # Package marker
    ├── config.py          # Configuration and environment settings
    ├── database.py        # Database setup and session management
    ├── models.py          # SQLAlchemy ORM models
    ├── schemas.py         # Pydantic request/response schemas
    ├── utils.py           # Utility functions
    │
    └── routes/            # API route handlers
        ├── __init__.py    # Package marker
        ├── status.py      # Status and health check routes
        └── contact.py     # Contact submission routes
```

## File Descriptions

### Core Application Files

#### `main.py`
- **Purpose**: Application entry point
- **Contains**: 
  - `create_app()` - Application factory function
  - FastAPI instance configuration
  - Middleware setup (CORS)
  - Route registration
  - Startup event handlers
- **Run**: `python main.py` or `uvicorn main:app --reload`

#### `app/config.py`
- **Purpose**: Centralized configuration
- **Contains**:
  - Database URL
  - Debug mode settings
  - API metadata (title, description, version)
  - Logging configuration
  - Environment variable loading
- **Usage**: Imported by other modules for configuration values

#### `app/database.py`
- **Purpose**: Database connectivity and session management
- **Contains**:
  - SQLAlchemy engine creation
  - Session factory
  - Declarative base for models
  - `init_db()` - Initialize database tables
  - `get_db()` - Dependency injection for sessions
- **Usage**: Used in routes for database operations

### Models and Schemas

#### `app/models.py`
- **Purpose**: SQLAlchemy ORM model definitions
- **Contains**:
  - `ContactSubmission` - Database model for contact form data
  - Schema templates for Phase 2 (Vehicle, Driver, Location, Trip, Maintenance)
- **Key Features**:
  - Automatic ID generation
  - Timestamps with UTC default
  - Docstrings for all fields
  - `__repr__` methods for debugging

#### `app/schemas.py`
- **Purpose**: Pydantic validation schemas
- **Contains**:
  - Request schemas: `ContactSubmissionCreate`
  - Response schemas: `ContactSubmissionResponse`, `ContactSubmissionList`
  - Health/Status schemas: `HealthCheckResponse`, `StatusResponse`
  - Error schema: `ErrorResponse`
  - Template schemas for Phase 2 features
- **Key Features**:
  - Request validation
  - Response serialization
  - Example data for API documentation
  - Email validation (using `EmailStr`)

### Routes

#### `app/routes/status.py`
- **Purpose**: System status and health check endpoints
- **Endpoints**:
  - `GET /` - Server status
  - `GET /health` - Database connectivity check
- **Features**:
  - Database connection verification
  - Used by Docker health checks
  - Used by load balancers

#### `app/routes/contact.py`
- **Purpose**: Contact form submission management
- **Endpoints**:
  - `POST /api/contact` - Create submission (201)
  - `GET /api/contact` - List submissions (with pagination)
  - `GET /api/contact/{id}` - Get specific submission
  - `DELETE /api/contact/{id}` - Delete submission (204)
- **Features**:
  - Input validation
  - Error handling
  - Database persistence
  - Console logging
  - Pagination support

### Utilities

#### `app/utils.py`
- **Purpose**: Common utility functions
- **Contains**:
  - `log_separator()` - Formatted console output
  - `format_timestamp()` - DateTime formatting
  - `format_phone()` - Phone number validation/formatting
- **Usage**: Used throughout the application for common tasks

## How Routes Are Organized

### Adding a New Feature (Example: Vehicles)

1. **Create Model** (`app/models.py`):
```python
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    # ... columns ...
```

2. **Create Schemas** (`app/schemas.py`):
```python
class VehicleCreate(BaseModel):
    # ... fields ...

class VehicleResponse(VehicleCreate):
    id: int
```

3. **Create Routes** (`app/routes/vehicle.py`):
```python
router = APIRouter(prefix="/api/vehicle", tags=["vehicle"])

@router.post("", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    # ... implementation ...
    pass
```

4. **Register in Main** (`main.py`):
```python
from app.routes import vehicle
app.include_router(vehicle.router)
```

## Database Schema

### Current Tables

#### `contact_submissions`
```sql
CREATE TABLE contact_submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ready for Implementation (Phase 2)

- `vehicles` - Fleet vehicle data
- `drivers` - Driver information
- `locations` - Plant and warehouse locations
- `trips` - Trip planning and tracking
- `maintenance` - Service records

## Dependency Injection Pattern

The project uses FastAPI's dependency injection pattern for database sessions:

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db

@router.post("/api/contact")
def create_contact(contact: ContactCreate, db: Session = Depends(get_db)):
    # db is automatically injected and closed after use
    db_contact = ContactSubmission(...)
    db.add(db_contact)
    db.commit()
```

## Environment Variables

Located in `.env`:
```
DATABASE_URL=postgresql://fleet_user:fleet_password@db:5432/fleet_management
DEBUG=True
LOG_LEVEL=INFO
```

## Testing the Structure

### Run Locally
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Run in Docker
```bash
docker-compose up --build
```

### Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Performance Considerations

1. **Database Connection Pool**: Configured in `database.py`
2. **Connection Verification**: `pool_pre_ping=True` checks connection health
3. **Session Management**: Automatic cleanup in `get_db()`
4. **Query Optimization**: Ready for indexing and query optimization

## Scalability

This structure supports:

- **Modular Growth**: Easy to add new routes and features
- **Feature Segregation**: Each feature has dedicated route file
- **Shared Utilities**: Common functions in `utils.py`
- **Configuration Management**: Centralized in `config.py`
- **Database Abstraction**: ORM handles database details

## Security Notes

### Current Implementation
✅ CORS enabled for development
✅ Pydantic validation on inputs
✅ SQLAlchemy ORM prevents SQL injection
✅ Email validation using `EmailStr`

### Production Recommendations
- Restrict CORS origins
- Add authentication middleware
- Implement rate limiting
- Add request logging
- Use HTTPS/TLS
- Add API key validation
- Implement authorization checks

## Debugging

### Enable SQL Logging
In `app/database.py`, change:
```python
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to True to see SQL queries
)
```

### View Logs
```bash
# Docker logs
docker-compose logs backend

# Live log follow
docker-compose logs -f backend
```

## Future Enhancements

1. **Add Caching**: Redis integration for frequently accessed data
2. **Add Monitoring**: Prometheus metrics and Grafana dashboards
3. **Add Queue**: Celery for async tasks (notifications, reports)
4. **Add Testing**: pytest for unit and integration tests
5. **Add Validation**: Comprehensive input validation middleware
6. **Add Authentication**: JWT tokens for API security
7. **Add Pagination**: Standard pagination for list endpoints
8. **Add Filtering**: Query parameter filtering for list endpoints

---

**Structure Designed For**: Scalability, Maintainability, and Team Collaboration
