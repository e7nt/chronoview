# Project Timelines — Motivation & Concept

## One-liner

The beautiful way to share and narrate project timelines.

## The Problem

Sharing project timelines today is painful:

- Screenshots of Notion tables or Google Sheets — static, ugly, no context
- Jira/Asana/Linear — powerful but you can't just hand someone a link to a clean timeline without giving them a login and drowning them in UI
- Gantt chart tools exist but they optimize for the editor, not the viewer
- There's no lightweight, portable, plain-text format for timelines (Mermaid Gantt is a toy)

## Who This Is For

**Primary:** Anyone who needs to share a project timeline with others — engineering leads, freelancers, agency folks, small teams.

**The wedge:** The read-only shared view is the product. The person receiving the link should have the best experience. Think of how Notion made docs pretty for readers, not just writers.

**Power users:** Developers who want timelines version-controlled alongside code via a plain-text format.

## Core Concept

A shareable, read-only-optimized Gantt chart backed by a plain-text format (`.timeline`) with planned-vs-actual tracking.

Not a PM tool. Not a task tracker. A way to **narrate** project progress.

## What Makes This Different

### 1. The Shadow (Planned vs Actual)

Every task has a planned duration and an optional actual duration. The renderer shows both — the planned bar as a muted "shadow" behind the actual. At a glance you see drift, early delivery, and delays.

```
Planned:  ████████████████████░░░░░░░░░░░░░░
Actual:       ░░░░░████████████████████████████████
              ^                              ^
          started late                   finished late
```

Click any item to see the detail: planned dates, actual dates, drift, notes.

### 2. Milestone Navigation

Milestones are vertical lines spanning the chart. You can skip between them — treating milestones as chapters. Walk through a timeline in a meeting: "Jump to Beta. Here's what landed. Here's what slipped."

### 3. The `.timeline` Format

A plain-text, human-readable, git-friendly format for project timelines.

```timeline
---
title: Project Phoenix
---

@ 2026-03-01 "Alpha Release"
@ 2026-05-15 "Beta Release"

! 2026-04-10 "Scheduled downtime for DB migration (4hrs)"

## Backend Team

- [done] API scaffolding | 2026-01-15 -> 2026-02-01 | #4A90D2
  actual: 2026-01-15 -> 2026-01-28

- [in-progress] Auth service | 2026-02-01 -> 2026-03-15 | #F5A623
  depends: API scaffolding

- [blocked] Payment integration | 2026-03-01 -> 2026-04-15 | #D0021B
  blocked-by: "Waiting on Stripe contract"
```

The format is the export/import — power users can author directly, but the primary interface is the app. If the app wins, the format gets adoption for free.

### 4. Sharing

- Public link: anyone with the URL sees the timeline
- Private link: URL + passcode (no account needed for viewer)
- The read-only view is the *best* view — not a degraded version

## Core Features (v1)

- Gantt chart renderer — one view, done beautifully
- Task statuses: todo, in-progress, done, blocked
- Color coding per item
- Milestones as labeled vertical lines with skip navigation
- Today line (dotted vertical)
- Shadow: planned vs actual on click-to-expand
- Notes/announcements pinned to dates
- Sections as swim lanes (teams/workstreams)
- Public and private (passcode) sharing
- Import/export via `.timeline` format

## Explicitly Not v1

- Multiple visualization formats (dot charts, etc.)
- Hour-level zoom / maintenance windows
- Aggregate estimation accuracy stats
- Format standardization efforts
- Recurring items
- Real-time collaboration / editing by multiple users

## The Retention Question

People share timelines infrequently (kickoff, retro, weekly updates). The shadow concept helps — if you're tracking actual vs planned, you have a reason to update weekly. But this is the biggest risk: low-frequency usage. Something to watch.

## Competitive Landscape (Researched April 2026)

### Existing Players — All Editor-First

| Tool | Weakness |
|---|---|
| TeamGantt | Clunky UI, slow with large projects |
| GanttPRO | Feature-heavy, overwhelming, dated design |
| Monday.com / ClickUp | Gantt is one of 15+ views — jack of all trades |
| Smartsheet / MS Project | Spreadsheet-first or enterprise-complex |
| Notion (timeline view) | Clean but extremely basic — no dependencies, no baselines |
| Toggl Plan | Clean UI but feature-limited |

**Key pattern:** Every tool is an editor-first PM platform with a Gantt view bolted on. None optimize for the viewer experience.

### Text-Based Format Gap

- **Mermaid Gantt** — No baselines, no statuses, no color coding. Rendering is functional but ugly.
- **PlantUML Gantt** — Slightly more expressive, still ugly output. No baselines.
- **Taskjuggler (.tjp)** — Full DSL but complex and dormant.
- **Markwhen** — Closest concept (markdown-like for timelines) but built for historical/chronological timelines, not project Gantt charts with dependencies and baselines.
- **No widely adopted plain-text project timeline format exists.** This is a genuine gap.

### Planned vs Actual — Universally Ugly

Only enterprise tools support it (MS Project, Smartsheet, GanttPRO). They all visualize it as gray/dashed ghost bars crammed into rows. Nobody has made baseline tracking elegant for a non-PM audience.

### Passcode Sharing — Nobody Has It

Zero tools offer passcode-protected timeline links. It's either "public to anyone" or "invite to platform." Simple gap, easy win.

### Our Positioning

| What we'd have | Who else has it |
|---|---|
| Plain-text format (.timeline) | Nobody (Mermaid is limited) |
| Viewer-first design | Nobody |
| Elegant planned vs actual | Nobody (enterprise has it but ugly) |
| Passcode sharing | Nobody |
| Beautiful Gantt | Linear's roadmap is closest, but locked inside Linear |

## Design Direction

### Philosophy: "Refined Restraint"

Follows the 2024-2026 trend set by Linear, Notion, and Amie — calm, intentional, premium.

### Visual Identity

- **Light mode default** — warm white (#FAFAF9), not pure white. Universally approachable for stakeholders.
- **Dark mode** — charcoal (#1C1C1E), not pure black. For the owner/editor crowd.
- **Typography** — Inter or Geist. Weight-based hierarchy (400/500/600), not size-based. Tabular numbers for dates (`font-variant-numeric: tabular-nums`).
- **Color palette** — Muted/desaturated tones (Radix UI color scale). Never garish primaries.
- **Bar style** — Accent stripe (3-4px saturated left edge) + muted fill. Not fully colored blocks. Accessible by default — color is never the sole differentiator.
- **Borders over shadows** — Subtle borders for separation, backdrop blur on floating elements.
- **Animations** — Spring physics (framer-motion), not linear easing. Bars stagger in on first load.

### Read-Only View (The Product)

- **Zero chrome** — no toolbars, no sidebars. The timeline IS the interface. Minimal floating nav at most.
- **Progressive disclosure** — task name + date range by default. Hover reveals status/assignee. Click expands inline detail (no modals).
- **Today line** — thin colored vertical line with subtle pulse animation.
- **Smooth horizontal scroll** — primary interaction, must feel buttery. Scroll-snap to time periods.
- **Mobile responsive** — vertical layout on phones. Most Gantt tools fail here completely.
- **OG preview image** — when shared in Slack/Teams, generate a preview image of the timeline. Major adoption driver.
- **Auto-fit** — automatically zoom to show the most relevant date range on load.

### Accessibility

- Accent stripe + icon + label on every bar (never color alone)
- 4.5:1 contrast ratio for text on colored backgrounds
- 6-8 categorical colors max, tested against deuteranopia and protanopia
- Keyboard navigation: arrow keys between tasks, +/- to zoom

## Framing

The format is the moat. The app is the entry point. The shadow is the hook. The sharing experience is the product.
