from datetime import date
from typing import Optional

from pydantic import BaseModel


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
    current_status: Optional[str] = "Available"
    is_on_leave: Optional[bool] = False
    rating: Optional[float] = 5.0


class DriverCreate(DriverBase):
    """
    Schema for creating a new Driver.
    """

    pass


class DriverUpdate(BaseModel):
    name: str | None = None
    license_no: str | None = None
    license_expiry: date | None = None
    phone: str | None = None
    home_plant_id: str | None = None
    status: str | None = None
    rating: float | None = None


class DriverResponse(DriverBase):
    """
    Schema for Driver response.
    """

    class Config:
        from_attributes = True
