"""Authentication routes: register, login, Google OAuth, profile."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db import get_db
from app.models import TimelineCollaborator, User


async def _backfill_collaborator_access(db: AsyncSession, user: User):
    """Link any pending collaborator invites to this user by email."""
    if not user.email:
        return
    await db.execute(
        update(TimelineCollaborator)
        .where(TimelineCollaborator.email == user.email.lower(), TimelineCollaborator.user_id.is_(None))
        .values(user_id=user.id)
    )
    await db.commit()


router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Schemas ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    avatar_url: str | None
    auth_provider: str

    model_config = {"from_attributes": True}


# --- Routes ---

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=body.email.lower(),
        hashed_password=get_password_hash(body.password),
        display_name=body.display_name,
        auth_provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _backfill_collaborator_access(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await _backfill_collaborator_access(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token}


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    from app.core.google_auth import verify_google_id_token

    payload = verify_google_id_token(body.credential)
    google_id = payload["sub"]
    email = payload["email"].lower()
    name = payload.get("name")
    picture = payload.get("picture")

    # 1. Existing user with this google_id → sign in
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user:
        # Update profile if changed
        changed = False
        if name and user.display_name != name:
            user.display_name = name
            changed = True
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            changed = True
        if changed:
            await db.commit()
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token}

    # 2. Existing user with same email → link Google and sign in
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        user.google_id = google_id
        user.auth_provider = "google"
        if name and not user.display_name:
            user.display_name = name
        if picture and not user.avatar_url:
            user.avatar_url = picture
        await db.commit()
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token}

    # 3. New user → create
    user = User(
        email=email,
        google_id=google_id,
        display_name=name,
        avatar_url=picture,
        auth_provider="google",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _backfill_collaborator_access(db, user)
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
    )
