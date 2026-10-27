import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    # The upper limit just stops someone sending us a novel to hash.
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def letters_numbers_and_symbols(cls, value: str) -> str:
        # Same rules as passwordRules() in the frontend's register form.
        if not any(c.isalpha() for c in value):
            raise ValueError("needs at least one letter")
        if not any(c.isdigit() for c in value):
            raise ValueError("needs at least one number")
        if not any(not c.isalnum() and not c.isspace() for c in value):
            raise ValueError("needs at least one symbol")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    # No strength rules here, so older passwords still work. Just the same size cap.
    password: str = Field(max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    created_at: datetime
