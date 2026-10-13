from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegistrationRequest, TokenResponse, UserProfile
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    ensure_default_admin_user,
    get_current_user,
    hash_password,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    ensure_default_admin_user()

    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(user.username, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
        },
    }


@router.post("/register", response_model=TokenResponse)
def register_user(payload: RegistrationRequest, db: Session = Depends(get_db)):
    ensure_default_admin_user()

    username = payload.username.strip()
    email = str(payload.email).strip().lower()
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already uses this email address.",
        )

    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        role="employee",
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.username, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        },
    }


@router.get("/me", response_model=UserProfile)
def get_logged_in_user(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
    }
