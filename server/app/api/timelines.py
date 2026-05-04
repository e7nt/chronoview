"""Timeline API — text-first architecture.

The .timeline text is the source of truth. Stored in the `content` column.
Parsed on read to produce structured JSON for the chart renderer.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.core.timeline_parser import parse_timeline
from app.db import get_db
from app.models import Timeline, TimelineCollaborator, TimelineVersion, User

router = APIRouter(prefix="/api/timelines", tags=["timelines"])


# --- Schemas ---


class TimelineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str | None = None


class TimelineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None


class TimelineListItem(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    role: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TimelineFull(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    parsed: dict
    color_scheme: str
    user_role: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# Collaborator schemas (kept from before)
class CollaboratorCreate(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    role: str = "viewer"


class CollaboratorUpdate(BaseModel):
    role: str


class CollaboratorResponse(BaseModel):
    id: uuid.UUID
    timeline_id: uuid.UUID
    email: str
    role: str
    user_id: uuid.UUID | None
    display_name: str | None = None
    created_at: str

    model_config = {"from_attributes": True}


# Version schemas (kept from before)
class VersionCreate(BaseModel):
    content: str = Field(min_length=1)
    label: str | None = None


class VersionResponse(BaseModel):
    id: uuid.UUID
    timeline_id: uuid.UUID
    label: str | None
    created_by: uuid.UUID
    created_at: str

    model_config = {"from_attributes": True}


class VersionFull(VersionResponse):
    content: str


# Share schemas
class ShareLinkCreate(BaseModel):
    is_public: bool = True
    passcode: str | None = Field(default=None, min_length=4, max_length=64)


class ShareLinkResponse(BaseModel):
    id: uuid.UUID
    timeline_id: uuid.UUID
    slug: str
    is_public: bool
    expires_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


# --- Helpers ---


async def _get_user_role(
    db: AsyncSession, timeline_id: uuid.UUID, user_id: uuid.UUID
) -> str | None:
    result = await db.execute(
        select(Timeline.id).where(Timeline.id == timeline_id, Timeline.owner_id == user_id)
    )
    if result.scalar_one_or_none():
        return "owner"
    result = await db.execute(
        select(TimelineCollaborator.role).where(
            TimelineCollaborator.timeline_id == timeline_id,
            TimelineCollaborator.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _get_timeline(
    db: AsyncSession, timeline_id: uuid.UUID, user_id: uuid.UUID, require_write: bool = False
) -> Timeline:
    role = await _get_user_role(db, timeline_id, user_id)
    if not role:
        raise HTTPException(status_code=404, detail="Timeline not found")
    if require_write and role == "viewer":
        raise HTTPException(status_code=403, detail="You don't have edit access to this timeline")
    result = await db.execute(select(Timeline).where(Timeline.id == timeline_id))
    return result.scalar_one()


def _default_content(title: str) -> str:
    return f"---\ntitle: {title}\n---\n\n# Timeline\n\n## Tasks\n\n"


# --- Timeline CRUD ---


@router.get("", response_model=list[TimelineListItem])
async def list_timelines(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    own_result = await db.execute(
        select(Timeline).where(Timeline.owner_id == user.id).order_by(Timeline.updated_at.desc())
    )
    owned = [
        TimelineListItem(
            id=t.id,
            owner_id=t.owner_id,
            title=t.title,
            role="owner",
            created_at=str(t.created_at),
            updated_at=str(t.updated_at),
        )
        for t in own_result.scalars().all()
    ]

    collab_result = await db.execute(
        select(Timeline, TimelineCollaborator.role)
        .join(TimelineCollaborator, TimelineCollaborator.timeline_id == Timeline.id)
        .where(TimelineCollaborator.user_id == user.id)
        .order_by(Timeline.updated_at.desc())
    )
    shared = [
        TimelineListItem(
            id=t.id,
            owner_id=t.owner_id,
            title=t.title,
            role=role,
            created_at=str(t.created_at),
            updated_at=str(t.updated_at),
        )
        for t, role in collab_result.all()
    ]

    return owned + shared


@router.post("", response_model=TimelineListItem, status_code=201)
async def create_timeline(
    data: TimelineCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = data.content or _default_content(data.title)
    timeline = Timeline(owner_id=user.id, title=data.title, content=content)
    db.add(timeline)
    await db.commit()
    await db.refresh(timeline)
    return TimelineListItem(
        id=timeline.id,
        owner_id=timeline.owner_id,
        title=timeline.title,
        role="owner",
        created_at=str(timeline.created_at),
        updated_at=str(timeline.updated_at),
    )


@router.get("/{timeline_id}")
async def get_timeline(
    timeline_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role = await _get_user_role(db, timeline_id, user.id)
    if not role:
        raise HTTPException(status_code=404, detail="Timeline not found")

    result = await db.execute(select(Timeline).where(Timeline.id == timeline_id))
    timeline = result.scalar_one()
    content = timeline.content or _default_content(timeline.title)
    parsed = parse_timeline(content)

    return {
        "id": str(timeline.id),
        "title": timeline.title,
        "content": content,
        "parsed": parsed,
        "color_scheme": timeline.color_scheme,
        "user_role": role,
        "created_at": str(timeline.created_at),
        "updated_at": str(timeline.updated_at),
    }


@router.put("/{timeline_id}")
async def update_timeline(
    timeline_id: uuid.UUID,
    data: TimelineUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    timeline = await _get_timeline(db, timeline_id, user.id, require_write=True)

    if data.title is not None:
        timeline.title = data.title
    if data.content is not None:
        timeline.content = data.content

    await db.commit()
    await db.refresh(timeline)

    content = timeline.content or _default_content(timeline.title)
    parsed = parse_timeline(content)

    return {
        "id": str(timeline.id),
        "title": timeline.title,
        "content": content,
        "parsed": parsed,
        "color_scheme": timeline.color_scheme,
        "user_role": await _get_user_role(db, timeline_id, user.id),
        "created_at": str(timeline.created_at),
        "updated_at": str(timeline.updated_at),
    }


@router.delete("/{timeline_id}", status_code=204)
async def delete_timeline(
    timeline_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    timeline = await _get_timeline(db, timeline_id, user.id, require_write=True)
    if timeline.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete a timeline")
    await db.delete(timeline)
    await db.commit()


# --- Collaborators (unchanged) ---


@router.get("/{timeline_id}/collaborators", response_model=list[CollaboratorResponse])
async def list_collaborators(
    timeline_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_timeline(db, timeline_id, user.id, require_write=True)
    result = await db.execute(
        select(TimelineCollaborator)
        .where(TimelineCollaborator.timeline_id == timeline_id)
        .order_by(TimelineCollaborator.created_at)
    )
    collabs = result.scalars().all()
    responses = []
    for c in collabs:
        display_name = None
        if c.user_id:
            user_result = await db.execute(select(User.display_name).where(User.id == c.user_id))
            display_name = user_result.scalar_one_or_none()
        responses.append(
            CollaboratorResponse(
                id=c.id,
                timeline_id=c.timeline_id,
                email=c.email,
                role=c.role,
                user_id=c.user_id,
                display_name=display_name,
                created_at=str(c.created_at),
            )
        )
    return responses


@router.post("/{timeline_id}/collaborators", response_model=CollaboratorResponse, status_code=201)
async def invite_collaborator(
    timeline_id: uuid.UUID,
    data: CollaboratorCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    timeline = await _get_timeline(db, timeline_id, user.id, require_write=True)
    if timeline.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owner can invite collaborators")

    email = data.email.lower().strip()
    if user.email and email == user.email.lower():
        raise HTTPException(status_code=400, detail="You can't invite yourself")

    existing = await db.execute(
        select(TimelineCollaborator).where(
            TimelineCollaborator.timeline_id == timeline_id,
            TimelineCollaborator.email == email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This email has already been invited")

    user_result = await db.execute(select(User).where(User.email == email))
    existing_user = user_result.scalar_one_or_none()

    collab = TimelineCollaborator(
        timeline_id=timeline_id,
        user_id=existing_user.id if existing_user else None,
        email=email,
        role=data.role,
        invited_by=user.id,
    )
    db.add(collab)
    await db.commit()
    await db.refresh(collab)

    return CollaboratorResponse(
        id=collab.id,
        timeline_id=collab.timeline_id,
        email=collab.email,
        role=collab.role,
        user_id=collab.user_id,
        display_name=existing_user.display_name if existing_user else None,
        created_at=str(collab.created_at),
    )


@router.put("/{timeline_id}/collaborators/{collab_id}", response_model=CollaboratorResponse)
async def update_collaborator(
    timeline_id: uuid.UUID,
    collab_id: uuid.UUID,
    data: CollaboratorUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    timeline = await _get_timeline(db, timeline_id, user.id, require_write=True)
    if timeline.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owner can change collaborator roles")
    result = await db.execute(
        select(TimelineCollaborator).where(
            TimelineCollaborator.id == collab_id, TimelineCollaborator.timeline_id == timeline_id
        )
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    collab.role = data.role
    await db.commit()
    await db.refresh(collab)
    display_name = None
    if collab.user_id:
        user_result = await db.execute(select(User.display_name).where(User.id == collab.user_id))
        display_name = user_result.scalar_one_or_none()
    return CollaboratorResponse(
        id=collab.id,
        timeline_id=collab.timeline_id,
        email=collab.email,
        role=collab.role,
        user_id=collab.user_id,
        display_name=display_name,
        created_at=str(collab.created_at),
    )


@router.delete("/{timeline_id}/collaborators/{collab_id}", status_code=204)
async def remove_collaborator(
    timeline_id: uuid.UUID,
    collab_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    timeline = await _get_timeline(db, timeline_id, user.id, require_write=True)
    if timeline.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owner can remove collaborators")
    result = await db.execute(
        select(TimelineCollaborator).where(
            TimelineCollaborator.id == collab_id, TimelineCollaborator.timeline_id == timeline_id
        )
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    await db.delete(collab)
    await db.commit()


# --- Versions ---


@router.get("/{timeline_id}/versions", response_model=list[VersionResponse])
async def list_versions(
    timeline_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_timeline(db, timeline_id, user.id, require_write=True)
    result = await db.execute(
        select(TimelineVersion)
        .where(TimelineVersion.timeline_id == timeline_id)
        .order_by(TimelineVersion.created_at.desc())
    )
    return [
        VersionResponse(
            id=v.id,
            timeline_id=v.timeline_id,
            label=v.label,
            created_by=v.created_by,
            created_at=str(v.created_at),
        )
        for v in result.scalars().all()
    ]


@router.post("/{timeline_id}/versions", response_model=VersionResponse, status_code=201)
async def create_version(
    timeline_id: uuid.UUID,
    data: VersionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_timeline(db, timeline_id, user.id, require_write=True)
    version = TimelineVersion(
        timeline_id=timeline_id, content=data.content, label=data.label, created_by=user.id
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return VersionResponse(
        id=version.id,
        timeline_id=version.timeline_id,
        label=version.label,
        created_by=version.created_by,
        created_at=str(version.created_at),
    )


@router.get("/{timeline_id}/versions/{version_id}", response_model=VersionFull)
async def get_version(
    timeline_id: uuid.UUID,
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_timeline(db, timeline_id, user.id, require_write=True)
    result = await db.execute(
        select(TimelineVersion).where(
            TimelineVersion.id == version_id, TimelineVersion.timeline_id == timeline_id
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return VersionFull(
        id=version.id,
        timeline_id=version.timeline_id,
        content=version.content,
        label=version.label,
        created_by=version.created_by,
        created_at=str(version.created_at),
    )
