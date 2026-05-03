from app.models.base import Base
from app.models.timeline import (
    ShareLink,
    Timeline,
    TimelineCollaborator,
    TimelineVersion,
    User,
)

# LEGACY: These models exist in the DB but are NOT used by the current API.
# The text-first architecture stores timeline data in Timeline.content.
# Do NOT use these for new code. Will be removed after table cleanup migration.
from app.models.timeline import Announcement, Milestone, Section, Task, TaskDependency

__all__ = [
    "Base",
    "User",
    "Timeline",
    "TimelineCollaborator",
    "TimelineVersion",
    "ShareLink",
    # Legacy — needed for Alembic awareness only
    "Section",
    "Task",
    "TaskDependency",
    "Milestone",
    "Announcement",
]
