"""add content column to timelines and backfill from relational data

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STATUS_MAP = {"todo": "todo", "in-progress": "in-progress", "done": "done", "blocked": "blocked", "cancelled": "cancelled"}


def _serialize_timeline(conn, timeline_id, title):
    """Build .timeline text from relational data for a single timeline."""
    lines = []
    lines.append("---")
    lines.append(f"title: {title}")
    lines.append("---")
    lines.append("")

    # Milestones (phases first, then milestones)
    milestones = conn.execute(
        sa.text("SELECT date, label, kind, sort_order FROM milestones WHERE timeline_id = :tid ORDER BY sort_order"),
        {"tid": timeline_id},
    ).fetchall()

    phases = [m for m in milestones if m.kind == "phase"]
    mstones = [m for m in milestones if m.kind != "phase"]

    if phases:
        lines.append("# Phases")
        for p in phases:
            lines.append(f'~ {p.date} "{p.label}"')
        lines.append("")

    if mstones:
        lines.append("# Milestones")
        for m in mstones:
            lines.append(f'@ {m.date} "{m.label}"')
        lines.append("")

    # Announcements
    announcements = conn.execute(
        sa.text("SELECT date, content, type FROM announcements WHERE timeline_id = :tid ORDER BY date"),
        {"tid": timeline_id},
    ).fetchall()

    if announcements:
        lines.append("# Notes")
        for a in announcements:
            type_tag = f" [{a.type}]" if a.type != "general" else ""
            lines.append(f'! {a.date}{type_tag} "{a.content}"')
        lines.append("")

    # Sections and tasks
    sections = conn.execute(
        sa.text("SELECT id, name, sort_order FROM sections WHERE timeline_id = :tid ORDER BY sort_order"),
        {"tid": timeline_id},
    ).fetchall()

    if sections:
        lines.append("# Timeline")
        lines.append("")

        for section in sections:
            lines.append(f"## {section.name}")
            lines.append("")

            tasks = conn.execute(
                sa.text("SELECT name, status, color, planned_start, planned_end, actual_start, actual_end, blocked_reason, note, url, sort_order FROM tasks WHERE section_id = :sid ORDER BY sort_order"),
                {"sid": section.id},
            ).fetchall()

            for task in tasks:
                status = STATUS_MAP.get(task.status, "todo")
                line = f"- [{status}] {task.name}"
                if task.planned_start and task.planned_end:
                    line += f" | {task.planned_start} -> {task.planned_end}"
                if task.color:
                    line += f" | {task.color}"
                lines.append(line)

                if task.actual_start and task.actual_end:
                    lines.append(f"  actual: {task.actual_start} -> {task.actual_end}")
                elif task.actual_start:
                    lines.append(f"  actual-start: {task.actual_start}")

                if task.blocked_reason:
                    lines.append(f'  blocked-by: "{task.blocked_reason}"')
                if task.note:
                    lines.append(f'  note: "{task.note}"')
                if task.url:
                    lines.append(f"  url: {task.url}")

            lines.append("")

    return "\n".join(lines)


def upgrade() -> None:
    # Add content column
    op.add_column('timelines', sa.Column('content', sa.Text(), nullable=True))

    # Backfill content from relational data
    conn = op.get_bind()
    timelines = conn.execute(sa.text("SELECT id, title FROM timelines")).fetchall()

    for tl in timelines:
        content = _serialize_timeline(conn, tl.id, tl.title)
        conn.execute(
            sa.text("UPDATE timelines SET content = :content WHERE id = :tid"),
            {"content": content, "tid": tl.id},
        )


def downgrade() -> None:
    op.drop_column('timelines', 'content')
