from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """
    Base schema for User data.
    """

    name: str
    email: EmailStr
    designation: Optional[str] = None
    plant_id: Optional[str] = None


class UserCreate(UserBase):
    """
    Schema for creating a new User with password.
    """

    password: str


class UserResponse(UserBase):
    """
    Schema for User response including database ID.
    """

    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
