from sqlalchemy import Column, Integer, String, ForeignKey
from app.database import Base

class User(Base):
    """
    User model for authorization and authentication.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    designation = Column(String(100), nullable=True)
    plant_id = Column(String(50), ForeignKey("locations.location_id"), nullable=True)

    def __repr__(self):
        """
        String representation of the User model.
        """
        return f"<User(id={self.id}, name={self.name}, email={self.email})>"
