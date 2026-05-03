"""
Parser for the .timeline format.
Python port of web/src/lib/timeline-parser.ts.
Converts .timeline text → dict structure for JSON response.
"""

import re
from typing import Any

ID_RE = re.compile(r"\s*<!--\s*(\w+):([\w-]+)\s*-->$")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
TASK_RE = re.compile(r"^- \[([^\]]+)\]\s+(.+)")
DATE_RANGE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})\s*->\s*(\d{4}-\d{2}-\d{2})")
COLOR_RE = re.compile(r"#[0-9A-Fa-f]{6}\b")


def _extract_id(line: str) -> tuple[str, str | None]:
    """Extract and strip embedded ID comment from end of line."""
    m = ID_RE.search(line)
    if m:
        return line[: m.start()].rstrip(), m.group(2)
    return line, None


def _extract_quoted(s: str) -> str:
    """Extract content from first quoted string."""
    m = re.search(r'"([^"]*)"', s)
    return m.group(1) if m else s.strip()


def parse_timeline(text: str) -> dict[str, Any]:
    """Parse .timeline text into a structured dict."""
    result: dict[str, Any] = {
        "title": "",
        "sections": [],
        "milestones": [],
        "announcements": [],
    }

    in_frontmatter = False
    current_section: dict | None = None
    current_task: dict | None = None
    milestone_order = 0
    section_order = 0
    task_order = 0

    for raw_line in text.split("\n"):
        trimmed = raw_line.strip()

        if not trimmed:
            current_task = None
            continue

        # Frontmatter
        if trimmed == "---":
            in_frontmatter = not in_frontmatter
            continue

        if in_frontmatter:
            colon = trimmed.find(":")
            if colon != -1:
                key = trimmed[:colon].strip()
                value = trimmed[colon + 1 :].strip()
                if key == "title":
                    result["title"] = value
            continue

        # Headings (context markers — we don't need to track context for parsing)
        if trimmed.startswith("# ") and not trimmed.startswith("## "):
            continue

        # Section header
        if trimmed.startswith("## "):
            clean, sid = _extract_id(trimmed)
            name = clean[3:].strip()
            current_section = {
                "id": sid,
                "name": name,
                "sort_order": section_order,
                "tasks": [],
            }
            section_order += 1
            result["sections"].append(current_section)
            current_task = None
            task_order = 0
            continue

        # Phase
        if trimmed.startswith("~ "):
            clean, mid = _extract_id(trimmed)
            rest = clean[2:].strip()
            date_match = DATE_RE.search(rest)
            label = _extract_quoted(rest)
            result["milestones"].append({
                "id": mid,
                "date": date_match.group(0) if date_match else None,
                "label": label,
                "kind": "phase",
                "sort_order": milestone_order,
            })
            milestone_order += 1
            continue

        # Milestone
        if trimmed.startswith("@ "):
            clean, mid = _extract_id(trimmed)
            rest = clean[2:].strip()
            date_match = DATE_RE.search(rest)
            label = _extract_quoted(rest)
            result["milestones"].append({
                "id": mid,
                "date": date_match.group(0) if date_match else None,
                "label": label,
                "kind": "milestone",
                "sort_order": milestone_order,
            })
            milestone_order += 1
            continue

        # Announcement
        if trimmed.startswith("! "):
            clean, aid = _extract_id(trimmed)
            rest = clean[2:].strip()
            date_match = DATE_RE.search(rest)
            type_match = re.search(r"\[(\w+)\]", rest)
            content = _extract_quoted(rest)
            ann_type = "general"
            if type_match:
                t = type_match.group(1).lower()
                if t in ("note", "downtime"):
                    ann_type = t
            result["announcements"].append({
                "id": aid,
                "date": date_match.group(0) if date_match else None,
                "content": content,
                "type": ann_type,
            })
            continue

        # Task line
        task_match = TASK_RE.match(trimmed)
        if task_match and current_section is not None:
            clean, tid = _extract_id(trimmed)
            full_match = TASK_RE.match(clean)
            if not full_match:
                continue

            status = full_match.group(1)
            rest_of_line = full_match.group(2)
            parts = [p.strip() for p in rest_of_line.split("|")]
            name = parts[0]

            planned_start = None
            planned_end = None
            color = None

            for part in parts[1:]:
                range_match = DATE_RANGE_RE.search(part)
                if range_match:
                    planned_start = range_match.group(1)
                    planned_end = range_match.group(2)
                else:
                    color_match = COLOR_RE.search(part)
                    if color_match:
                        color = color_match.group(0)

            current_task = {
                "id": tid,
                "name": name,
                "status": status,
                "color": color,
                "planned_start": planned_start,
                "planned_end": planned_end,
                "actual_start": None,
                "actual_end": None,
                "blocked_reason": None,
                "note": None,
                "url": None,
                "sort_order": task_order,
                "depends_on": [],
            }
            task_order += 1
            current_section["tasks"].append(current_task)
            continue

        # Metadata lines (indented)
        if raw_line.startswith("  ") and current_task is not None:
            colon = trimmed.find(":")
            if colon == -1:
                continue
            key = trimmed[:colon].strip()
            value = trimmed[colon + 1 :].strip()

            if key == "actual":
                range_match = DATE_RANGE_RE.search(value)
                if range_match:
                    current_task["actual_start"] = range_match.group(1)
                    current_task["actual_end"] = range_match.group(2)
            elif key == "actual-start":
                date_match = DATE_RE.search(value)
                if date_match:
                    current_task["actual_start"] = date_match.group(0)
            elif key == "actual-end":
                date_match = DATE_RE.search(value)
                if date_match:
                    current_task["actual_end"] = date_match.group(0)
            elif key == "blocked-by":
                current_task["blocked_reason"] = _extract_quoted(value)
            elif key == "note":
                current_task["note"] = _extract_quoted(value)
            elif key == "url":
                current_task["url"] = value
            elif key == "depends":
                current_task["depends_on"] = [d.strip() for d in value.split(",") if d.strip()]
            continue

    return result
