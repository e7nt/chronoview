# Chronoview

Beautiful, shareable project timelines backed by a plain-text `.timeline` format.

## Quick Start

```bash
make up-build    # Start all services (Postgres + FastAPI + Vite)
make migrate     # Apply database migrations
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons
- **Fonts:** DM Sans + DM Mono
- **Infra:** Docker Compose, Makefile

## Key Conventions

- Use `uv` for Python deps, `pnpm` for Node deps
- Use `ruff` for Python linting, `biome` for TypeScript linting
- Never run migrations automatically — use `make migrate`
- Auth is currently a dev-user stub. Replace with Firebase before production.
- All dates use UTC internally (see `date-utils.ts`)
- Shared color constants live in `web/src/lib/constants.ts`
- Status values: todo, in-progress, done, blocked, cancelled

## Project Layout

```
server/           FastAPI backend
  app/
    api/          Route handlers (timelines.py, share.py)
    models/       SQLAlchemy models
    auth.py       Auth dependency (dev-user stub)
    schemas.py    Pydantic request/response schemas
    config.py     Environment-based settings
    db.py         Async session factory
  alembic/        Migration files

web/              React frontend
  src/
    components/
      gantt/      Gantt chart renderer (GanttChart, GanttBar, GanttHeader, TaskDetail)
      timeline/   Source view (TimelineSource)
      ErrorBoundary.tsx
    lib/
      api.ts      API client
      types.ts    TypeScript interfaces
      constants.ts Shared colors and labels
      date-utils.ts UTC date helpers
      timeline-serializer.ts  .timeline format serializer
    pages/        Home, TimelineView
```
