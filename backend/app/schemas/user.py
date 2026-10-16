from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("A senha não pode ultrapassar 72 bytes em UTF-8.")
        return value

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str | None) -> str | None:
        return None if value is None else UserCreate.validate_password_bytes(value)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str = Field(min_length=1, max_length=4096)
    new_password: str = Field(min_length=6, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        return UserCreate.validate_password_bytes(value)
