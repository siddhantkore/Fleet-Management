from pydantic import BaseModel
from datetime import date
from typing import Optional

class DriverBase(BaseModel):
    """
    Base schema for Driver data.
    """
    
    driver_id: str
    name: str
    license_no: str
    license_expiry: date
    phone: str
    home_plant_id: str
    status: Optional[str] = "Active"
    rating: Optional[float] = 5.0

class DriverCreate(DriverBase):
    """
    Schema for creating a new Driver.
    """
    pass

class DriverResponse(DriverBase):
    """
    Schema for Driver response.
    """
    class Config:
        from_attributes = True
