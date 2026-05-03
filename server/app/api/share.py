import secrets
import uuid
from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.core.timeline_parser import parse_timeline
from app.db import get_db
from app.models import ShareLink, Timeline, User

router = APIRouter(tags=["share"])


class ShareLinkCreate(BaseModel):
    is_public: bool = True
    passcode: str | None = Field(default=None, min_length=4, max_length=64)
    expires_at: datetime | None = None


class PasscodeVerify(BaseModel):
    passcode: str = Field(min_length=1)


def _check_expiry(share_link: ShareLink) -> None:
    if share_link.expires_at and share_link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")


async def _load_shared_timeline(db: AsyncSession, timeline_id: uuid.UUID) -> dict:
    result = await db.execute(select(Timeline).where(Timeline.id == timeline_id))
    timeline = result.scalar_one_or_none()
    if not timeline:
        raise HTTPException(status_code=404, detail="Timeline not found")

    content = timeline.content or f"---\ntitle: {timeline.title}\n---\n"
    parsed = parse_timeline(content)

    return {
        "id": str(timeline.id),
        "title": timeline.title,
        "content": content,
        "parsed": parsed,
        "color_scheme": timeline.color_scheme,
        "created_at": str(timeline.created_at),
        "updated_at": str(timeline.updated_at),
    }


@router.post("/api/timelines/{timeline_id}/share", status_code=201)
async def create_share_link(
    timeline_id: uuid.UUID,
    data: ShareLinkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Timeline).where(Timeline.id == timeline_id, Timeline.owner_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Timeline not found")

    slug = secrets.token_urlsafe(8)
    passcode_hash = None
    if data.passcode:
        passcode_hash = bcrypt.hashpw(data.passcode.encode(), bcrypt.gensalt()).decode()

    share_link = ShareLink(
        timeline_id=timeline_id, slug=slug, is_public=data.is_public,
        passcode_hash=passcode_hash, expires_at=data.expires_at,
    )
    db.add(share_link)
    await db.commit()
    await db.refresh(share_link)
    return {
        "id": str(share_link.id), "timeline_id": str(share_link.timeline_id),
        "slug": share_link.slug, "is_public": share_link.is_public,
        "expires_at": str(share_link.expires_at) if share_link.expires_at else None,
        "created_at": str(share_link.created_at),
    }


@router.get("/api/s/{slug}")
async def get_shared_timeline(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShareLink).where(ShareLink.slug == slug))
    share_link = result.scalar_one_or_none()
    if not share_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    _check_expiry(share_link)

    if not share_link.is_public:
        return {"requires_passcode": True, "timeline_id": str(share_link.timeline_id)}

    return await _load_shared_timeline(db, share_link.timeline_id)


@router.post("/api/s/{slug}/verify")
async def verify_passcode(slug: str, data: PasscodeVerify, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShareLink).where(ShareLink.slug == slug))
    share_link = result.scalar_one_or_none()
    if not share_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    _check_expiry(share_link)

    if not share_link.passcode_hash:
        raise HTTPException(status_code=400, detail="This link does not require a passcode")

    try:
        if not bcrypt.checkpw(data.passcode.encode(), share_link.passcode_hash.encode()):
            raise HTTPException(status_code=403, detail="Invalid passcode")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=403, detail="Invalid passcode") from e

    return await _load_shared_timeline(db, share_link.timeline_id)
