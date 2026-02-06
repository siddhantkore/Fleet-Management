from pydantic import BaseModel

class HealthCheckResponse(BaseModel):
    """Schema for health check response"""
    status: str
    database: str

class StatusResponse(BaseModel):
    """Schema for API status response"""
    message: str
    status: str
    api_version: str

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    detail: str
    status_code: int = 400
