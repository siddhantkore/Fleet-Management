# Fleet Management System - Setup and Architecture Guide

## Project Overview

The **Fleet Management System** is a centralized Vehicle Allocation and Logistics Optimization platform designed for multi-plant organizations. It provides real-time tracking, automated vehicle assignment, compliance alerts, and comprehensive analytics for fleet operations.

---

## System Architecture

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React.js 19.2.0 with Vite |
| **Backend** | FastAPI (Python 3.11) |
| **Database** | PostgreSQL 16 + PostGIS |
| **Containerization** | Docker & Docker Compose |
| **Optimization Engine** | Google OR-Tools (for extended features) |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Or: Node.js 20+, Python 3.11+, PostgreSQL 16

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to project root
cd /workspaces/Fleet-Management

# Build and start all services
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8000
# - Database: localhost:5432
```

### Option 2: Local Development Setup

#### Backend Setup
```bash
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with database credentials
echo "DATABASE_URL=postgresql://fleet_user:fleet_password@localhost:5432/fleet_management" > .env

# Run FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### PostgreSQL Database
```bash
# Create database and user
createuser --superuser fleet_user
createdb -O fleet_user fleet_management

# Set password
psql -c "ALTER USER fleet_user WITH PASSWORD 'fleet_password';"
```

#### Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Project Structure

```
Fleet-Management/
├── docker-compose.yml           # Container orchestration
├── README.md
│
├── client/                      # React Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── .env                     # API URL config
│   ├── src/
│   │   ├── main.jsx            # Entry point
│   │   ├── App.jsx             # Router setup
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Home page
│   │   │   ├── LandingPage.css
│   │   │   ├── ContactPage.jsx    # Contact form
│   │   │   └── ContactPage.css
│   │   └── assets/
│   └── public/
│
├── server/                      # FastAPI Backend
│   ├── Dockerfile
│   ├── main.py                 # FastAPI app
│   ├── requirements.txt         # Python dependencies
│   └── .env                    # Database config
│
└── docs/                        # System Documentation
    ├── REQUIREMENTS.md          # Functional & Non-Functional Reqs
    ├── TECHNICAL_DESIGN_DOCUMENT.md
    ├── DATA.md                  # Schema Documentation
    └── dataset/
        ├── vehicles.csv
        ├── drivers.csv
        ├── locations.csv
        ├── trips.csv
        └── distance_matrix.csv
```

---

## 🗄️ Database Schema

### ContactSubmission Table
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

### Ready for Implementation (Schema Templates)
The system is designed to support the following tables:

- **vehicles**: Vehicle master data with capacity, fuel type, cost metrics
- **drivers**: Driver information with license details and ratings
- **locations**: Plant and warehouse locations with GPS coordinates
- **trips**: Trip planning and execution tracking
- **maintenance**: Service records and preventive maintenance schedules

---

## API Endpoints

### Root Endpoint
```bash
GET /
# Returns: Server status and version info
```

### Health Check
```bash
GET /health
# Returns: Server and database health status
```

### Contact Management
```bash
# Create contact submission
POST /api/contact
Content-Type: application/json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Fleet Inquiry",
  "message": "I'm interested in your fleet management solution"
}

# Get all contacts (for admin)
GET /api/contacts

# Get specific contact
GET /api/contacts/{contact_id}
```

---

## Frontend Features

### Landing Page (`/`)
- **Hero Section**: Project overview and value proposition
- **Features Grid**: 6 key system capabilities
- **Architecture Overview**: System components
- **Data Models**: Supported data structures
- **Call-to-Action**: Navigation to contact form
- **Responsive Design**: Mobile-friendly layout

### Contact Page (`/contact`)
- **Contact Form**: Collect user inquiries
- **Contact Information**: Company details
- **Form Validation**: Client-side validation
- **Success/Error Alerts**: User feedback
- **Backend Integration**: POST data to `/api/contact`
- **Responsive Design**: Mobile-optimized forms

---

## Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://fleet_user:fleet_password@db:5432/fleet_management
DEBUG=True
```

### Client (.env)
```
VITE_API_URL=http://localhost:8000
```

### Client Docker (.env.docker)
```
VITE_API_URL=http://backend:8000
```

---

## Dependencies

### Backend (Python)
- **fastapi==0.104.1**: Web framework
- **uvicorn==0.24.0**: ASGI server
- **sqlalchemy==2.0.23**: ORM
- **psycopg2-binary==2.9.9**: PostgreSQL adapter
- **python-dotenv==1.0.0**: Environment management
- **pydantic==2.5.0**: Data validation
- **python-jose**: JWT support (for future auth)
- **passlib**: Password hashing (for future auth)

### Frontend (Node.js)
- **react@19.2.0**: UI framework
- **react-dom@19.2.0**: React DOM rendering
- **react-router-dom@6.20.0**: Client-side routing
- **axios@1.6.2**: HTTP client
- **vite@7.2.4**: Build tool

---

## Verification Checklist

- [x] FastAPI server created with PostgreSQL connection
- [x] Contact submission endpoint implemented
- [x] Database table auto-created on startup
- [x] React landing page with feature overview
- [x] Contact form page with validation
- [x] Form submission sends data to backend
- [x] Backend logs and stores submissions
- [x] Docker & Docker Compose configuration
- [x] Requirements.txt for both client and server
- [x] Environment variables configured
- [ ] Integration testing (See Testing Guide below)

---

## Testing Guide

### 1. Start Services
```bash
docker-compose up --build
```

### 2. Test Backend Health
```bash
# Check if backend is running
curl http://localhost:8000/

# Check database connectivity
curl http://localhost:8000/health
```

### 3. Test Frontend
Open browser: `http://localhost:5173`
- Landing page loads properly
- All sections visible
- Navigation buttons work
- Images and icons display

### 4. Test Contact Form
1. Click "Contact Us" button
2. Fill in contact form with test data
3. Submit form
4. Check success message
5. Verify data in backend logs
6. Query database for submitted data

```bash
# Access database
docker exec -it fleet-management-db psql -U fleet_user -d fleet_management

# Query submissions
SELECT * FROM contact_submissions;
```

---

## Troubleshooting

### Issue: Database connection fails
```bash
# Check if database container is running
docker ps | grep fleet-management-db

# Check database logs
docker logs fleet-management-db

# Verify connection string matches
```

### Issue: Frontend can't connect to backend
```bash
# Verify API URL in .env
cat client/.env

# Check backend is running
curl http://localhost:8000/health

# Check CORS is enabled
```

### Issue: Port already in use
```bash
# Change ports in docker-compose.yml
# Or kill process using the port:
lsof -i :5173  # Find process on port 5173
kill -9 <PID>
```

---

## Future Enhancements

### Phase 2 (Vehicle & Driver Management)
- Vehicle master data CRUD operations
- Driver management and license tracking
- Real-time vehicle status updates
- GPS integration for live tracking

### Phase 3 (Optimization Engine)
- Integration with Google OR-Tools
- Multi-Depot Vehicle Routing Problem solving
- Route optimization with constraints
- Cost and time minimization

### Phase 4 (Advanced Features)
- Compliance & maintenance alerting system
- Dashboard with KPI analytics
- Historical trip analysis
- Performance reporting

### Phase 5 (Deployment)
- Production-grade database backup
- CDN for static assets
- SSL/TLS certificates
- Load balancing

---

## Support

For questions or issues:
1. Check the troubleshooting section
2. Review API documentation
3. Check FastAPI docs: `http://localhost:8000/docs`
4. Review React component source code

---
