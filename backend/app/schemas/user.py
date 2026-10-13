from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=255)
    role: str = Field(default="employee", pattern="^(admin|manager|employee|viewer)$")
    full_name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=6, max_length=255)
    role: str | None = Field(default=None, pattern="^(admin|manager|employee|viewer)$")
    is_active: bool | None = None
    full_name: str | None = Field(default=None, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
