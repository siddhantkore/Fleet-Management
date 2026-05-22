from typing import Optional

from pydantic import BaseModel


class VehicleBase(BaseModel):
    """
    Base schema for Vehicle data.
    """

    vehicle_id: str
    type: str
    plant_loc_id: str
    capacity_kg: float
    volume_cbm: float
    fuel_type: str
    cost_per_km: float
    license_plate: str
    mileage_kmpl: Optional[float] = 8.0
    odometer_km: Optional[int] = 0
    max_density_kg_cbm: Optional[float] = None
    suitable_cargo_types: Optional[str] = "General"


class VehicleCreate(VehicleBase):
    """
    Schema for creating a new Vehicle.
    """

    pass


class VehicleResponse(VehicleBase):
    """
    Schema for Vehicle response including current status.
    """

    current_status: str

    class Config:
        from_attributes = True
