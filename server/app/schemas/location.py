from pydantic import BaseModel

class LocationBase(BaseModel):
    """
    Base schema for Location data.
    """
    location_id: str
    name: str
    type: str
    latitude: float
    longitude: float
    city: str

class LocationCreate(LocationBase):
    """
    Schema for creating a new Location.
    """
    pass

class LocationResponse(LocationBase):
    """
    Schema for Location response.
    """
    class Config:
        from_attributes = True
