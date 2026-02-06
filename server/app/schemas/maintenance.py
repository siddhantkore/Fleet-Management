from pydantic import BaseModel
from datetime import date
from typing import Optional

class MaintenanceBase(BaseModel):
    """
    Base schema for Maintenance data.
    """
    maint_id: str
    vehicle_id: str
    date: date
    type: str
    cost: float
    odometer_reading: int
    description: Optional[str] = None

class MaintenanceCreate(MaintenanceBase):
    """
    Schema for creating a new Maintenance record.
    """
    pass

class MaintenanceResponse(MaintenanceBase):
    """
    Schema for Maintenance response.
    """
    class Config:
        from_attributes = True
