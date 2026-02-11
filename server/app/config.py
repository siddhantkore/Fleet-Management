import os

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://fleet_user:fleet_password@db:5432/fleet_management"
)

# Debug mode
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# API Configuration
API_TITLE = "Fleet Management API"
API_DESCRIPTION = "Backend API for Fleet Management System"
API_VERSION = "1.0.0"

# Auth Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-it")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
