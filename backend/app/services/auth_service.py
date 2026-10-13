import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import SessionLocal, get_db
from app.models.user import User

security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16).encode("utf-8")
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    )
    return f"pbkdf2_sha256${salt.decode('utf-8')}${derived.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = password_hash.split("$", 2)
        if algorithm != "pbkdf2_sha256":
            return False

        salt = salt_hex.encode("utf-8")
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            200_000,
        )
        return secrets.compare_digest(derived.hex(), digest_hex)
    except ValueError:
        return False


def ensure_default_admin_user() -> None:
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()

        if user is None:
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            return

        if user.role != "admin":
            user.role = "admin"

        if not verify_password(settings.ADMIN_PASSWORD, user.password_hash):
            user.password_hash = hash_password(settings.ADMIN_PASSWORD)

        db.commit()
    finally:
        db.close()


def create_access_token(username: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise ValueError("Invalid or expired token.") from exc

    username = payload.get("sub")
    role = payload.get("role")

    if not username or not role:
        raise ValueError("Invalid token payload.")

    return {"username": username, "role": role}


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = (
        db.query(User)
        .filter(User.username == username, User.is_active.is_(True))
        .first()
    )

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    try:
        payload = verify_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = (
        db.query(User)
        .filter(User.username == payload["username"], User.is_active.is_(True))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is no longer active.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"username": user.username, "role": user.role}


def require_roles(*allowed_roles: str):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency
