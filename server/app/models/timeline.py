import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class User(UUIDMixin, Base):
    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String, nullable=False, server_default="local")
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    firebase_uid: Mapped[str | None] = mapped_column(
        String, unique=True, nullable=True
    )  # legacy, to be removed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    timelines: Mapped[list["Timeline"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Timeline(UUIDMixin, Base):
    __tablename__ = "timelines"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    color_scheme: Mapped[str] = mapped_column(String, default="default")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="timelines")
    # Legacy relationships — kept temporarily for data migration
    sections: Mapped[list["Section"]] = relationship(
        back_populates="timeline", cascade="all, delete-orphan", order_by="Section.sort_order"
    )
    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="timeline", cascade="all, delete-orphan", order_by="Milestone.date"
    )
    announcements: Mapped[list["Announcement"]] = relationship(
        back_populates="timeline", cascade="all, delete-orphan", order_by="Announcement.date"
    )
    share_links: Mapped[list["ShareLink"]] = relationship(
        back_populates="timeline", cascade="all, delete-orphan"
    )
    collaborators: Mapped[list["TimelineCollaborator"]] = relationship(
        back_populates="timeline", cascade="all, delete-orphan"
    )


class Section(UUIDMixin, Base):
    __tablename__ = "sections"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    timeline: Mapped["Timeline"] = relationship(back_populates="sections")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="section", cascade="all, delete-orphan", order_by="Task.sort_order"
    )


class Task(UUIDMixin, Base):
    __tablename__ = "tasks"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="todo")
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    planned_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    planned_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    section: Mapped["Section"] = relationship(back_populates="tasks")
    dependencies: Mapped[list["TaskDependency"]] = relationship(
        foreign_keys="TaskDependency.task_id", cascade="all, delete-orphan"
    )


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    depends_on_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )


class Milestone(UUIDMixin, Base):
    __tablename__ = "milestones"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    label: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False, default="milestone")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    timeline: Mapped["Timeline"] = relationship(back_populates="milestones")


class Announcement(UUIDMixin, Base):
    __tablename__ = "announcements"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, default="general")

    timeline: Mapped["Timeline"] = relationship(back_populates="announcements")


class ShareLink(UUIDMixin, Base):
    __tablename__ = "share_links"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    passcode_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    timeline: Mapped["Timeline"] = relationship(back_populates="share_links")


class TimelineCollaborator(UUIDMixin, Base):
    __tablename__ = "timeline_collaborators"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="viewer")
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    timeline: Mapped["Timeline"] = relationship(back_populates="collaborators")
    user: Mapped["User | None"] = relationship(foreign_keys=[user_id])


class TimelineVersion(UUIDMixin, Base):
    __tablename__ = "timeline_versions"

    timeline_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("timelines.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    timeline: Mapped["Timeline"] = relationship()
