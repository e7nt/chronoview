# Chronoview

> The beautiful way to share and narrate project timelines.

Chronoview is a viewer-first Gantt tool backed by a plain-text `.timeline` format. It is designed for the people who *receive* the link, not just the person editing the chart.

## Highlights

- **Shadow tracking** — each task carries a planned and an actual range, rendered side-by-side so drift is visible at a glance.
- **Milestone navigation** — milestones act like chapters; jump between them with the keyboard.
- **`.timeline` format** — plain-text, human-readable, git-friendly. Author in the editor or version-control alongside code.
- **Shareable links** — public or passcode-protected. Viewers do not need an account.
- **Local-first editor** — drafts persist in the browser before they ever hit the server.

## Quick start

```bash
git clone git@github.com:e7nt/chronoview.git
cd chronoview
cp .env.example .env
make up-build
make migrate
```

Then open:

| Service | URL |
| --- | --- |
| App | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

`make help` lists every target.

## The `.timeline` format

```timeline
---
title: Project Phoenix
---

@ 2026-03-01 "Alpha Release"
@ 2026-05-15 "Beta Release"
! 2026-04-10 "Scheduled downtime — DB migration"

## Backend Team

- [done] API scaffolding | 2026-01-15 -> 2026-02-01 | #6366F1
  actual: 2026-01-15 -> 2026-01-28
  note: "Shipped 3 days early"

- [in-progress] Auth service | 2026-02-01 -> 2026-03-15

- [blocked] Payments | 2026-03-01 -> 2026-04-15
  blocked-by: "Waiting on Stripe contract"
```

See [`examples/`](./examples) for runnable samples and [`MOTIVATION.md`](./MOTIVATION.md) for the design rationale.

## Tech stack

| Layer | Tooling |
| --- | --- |
| Backend | FastAPI · SQLAlchemy (async) · Alembic · PostgreSQL · `uv` · `ruff` |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · `pnpm` · `biome` |
| Auth | JWT (email/password) + Google OAuth ID-token verification |
| Infra | Docker Compose · Makefile |

A deeper map of the codebase lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Contributing

We welcome issues and pull requests. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the development workflow, code conventions, and how to propose changes.

## License

[MIT](./LICENSE)
