from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ======================== Contact Schemas ========================

class ContactSubmissionCreate(BaseModel):
    """
    Schema for creating a new contact submission.
    Validates incoming request data.
    """
    name: str
    email: EmailStr
    phone: str
    subject: str
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
                "subject": "Fleet Inquiry",
                "message": "I'm interested in your fleet management solution"
            }
        }


class ContactSubmissionResponse(ContactSubmissionCreate):
    """
    Schema for contact submission response.
    Includes database-generated fields.
    """
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ContactSubmissionList(BaseModel):
    """Schema for list of contact submissions"""
    id: int
    name: str
    email: str
    subject: str
    created_at: datetime

    class Config:
        from_attributes = True


# ======================== Health Check Schema ========================

class HealthCheckResponse(BaseModel):
    """Schema for health check response"""
    status: str
    database: str


class StatusResponse(BaseModel):
    """Schema for API status response"""
    message: str
    status: str
    api_version: str


# ======================== Error Schema ========================

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    detail: str
    status_code: int = 400


# ======================== SCHEMA TEMPLATES (Ready for Phase 2) ========================

# class VehicleCreate(BaseModel):
#     """Schema for vehicle creation"""
#     vehicle_id: str
#     vehicle_type: str
#     plant_loc_id: str
#     capacity_kg: float
#     volume_cbm: float
#     fuel_type: str
#     cost_per_km: float
#     license_plate: str
#
#     class Config:
#         json_schema_extra = {"example": {"vehicle_id": "V001", ...}}
#
#
# class VehicleResponse(VehicleCreate):
#     """Schema for vehicle response"""
#     current_status: Optional[str]
#
#     class Config:
#         from_attributes = True
#
#
# class DriverCreate(BaseModel):
#     """Schema for driver creation"""
#     driver_id: str
#     name: str
#     license_no: str
#     license_expiry: datetime
#     phone: str
#     home_plant_id: str
#     status: str
#     rating: Optional[float]
#
#
# class DriverResponse(DriverCreate):
#     """Schema for driver response"""
#
#     class Config:
#         from_attributes = True
