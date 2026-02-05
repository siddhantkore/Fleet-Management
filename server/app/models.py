from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.database import Base


class ContactSubmission(Base):
    """
    Model for storing contact form submissions from the landing page.
    
    Attributes:
        id: Primary key, auto-incremented
        name: Contact person's name
        email: Contact email address
        phone: Contact phone number (optional)
        subject: Subject of the inquiry
        message: Detailed message content
        created_at: Timestamp of submission
    """
    __tablename__ = "contact_submissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    subject = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ContactSubmission(id={self.id}, name={self.name}, email={self.email})>"


# ============================================
# SCHEMA-READY MODELS (Not yet implemented)
# These models are ready for Phase 2 development
# ============================================

# class Vehicle(Base):
#     """Vehicle master data model"""
#     __tablename__ = "vehicles"
#     # Attributes as per DATA.md:
#     # Vehicle_ID, Type, Plant_Loc_ID, Capacity_Kg, Volume_CBM, 
#     # Fuel_Type, Cost_Per_KM, Current_Status, License_Plate

# class Driver(Base):
#     """Driver master data model"""
#     __tablename__ = "drivers"
#     # Attributes as per DATA.md:
#     # Driver_ID, Name, License_No, License_Expiry, Phone, 
#     # Home_Plant_ID, Status, Rating

# class Location(Base):
#     """Location/Plant master data model"""
#     __tablename__ = "locations"
#     # Attributes as per DATA.md:
#     # Location_ID, Name, Type, Latitude, Longitude, City

# class Trip(Base):
#     """Trip planning and tracking model"""
#     __tablename__ = "trips"
#     # Attributes as per DATA.md:
#     # Trip_ID, Vehicle_ID, Driver_ID, From_Loc, To_Loc, 
#     # Start_Time, End_Time, Distance_KM, Status

# class Maintenance(Base):
#     """Maintenance records model"""
#     __tablename__ = "maintenance"
#     # Attributes as per DATA.md:
#     # Maint_ID, Vehicle_ID, Date, Type, Cost, 
#     # Odometer_Reading, Description
