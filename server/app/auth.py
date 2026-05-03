"""Authentication dependency — JWT-based.

Extracts Bearer token, decodes JWT, and returns the User.
Falls back to dev-user only when DEV_MODE=true is explicitly set.
"""

import logging
import uuid

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_token
from app.db import get_db
from app.models import User

logger = logging.getLogger(__name__)


async def _get_dev_user(db: AsyncSession) -> User:
    """Fallback dev user for local development only."""
    result = await db.execute(select(User).where(User.email == "dev@localhost"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email="dev@localhost", display_name="Dev User", auth_provider="local")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify JWT token, then return the user.

    Falls back to dev-user only when settings.dev_mode is True and no token is provided.
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        if settings.dev_mode:
            return await _get_dev_user(db)
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header[7:]
    payload = decode_token(token)

    if payload is None:
        logger.warning("Token decode failed — expired or tampered")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id_str = payload.get("sub")
    if not user_id_str:
        logger.warning("Token missing 'sub' claim")
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning("Token has invalid UUID in 'sub': %s", user_id_str)
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        logger.warning("Token references non-existent user: %s", user_id)
        raise HTTPException(status_code=401, detail="User not found")

    return user
