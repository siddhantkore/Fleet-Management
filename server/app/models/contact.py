from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from datetime import datetime
from app.database import Base

class ContactSubmission(Base):
    """
    Model for storing contact form submissions from the landing page.
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
