from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class ContactSubmissionBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

class ContactSubmissionCreate(ContactSubmissionBase):
    pass

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

class ContactSubmissionResponse(ContactSubmissionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ContactSubmissionList(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    created_at: datetime

    class Config:
        from_attributes = True
