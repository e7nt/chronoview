# Architecture

This document is a map of the Chronoview codebase: the major pieces, how they fit together, and where to start when you want to change something.

## Big picture

```
┌──────────────┐    HTTP / JSON    ┌──────────────┐    asyncpg     ┌────────────┐
│   web/       │ ────────────────▶ │   server/    │ ─────────────▶ │ PostgreSQL │
│  React 19    │ ◀──────────────── │  FastAPI     │ ◀───────────── │            │
└──────────────┘                   └──────────────┘                └────────────┘
        │                                  │
        │                                  └─ Alembic migrations (manual)
        └─ Local-first drafts in localStorage
```

- The frontend is a single-page React app served by Vite.
- The backend is a stateless FastAPI app talking to PostgreSQL via SQLAlchemy async.
- The two are wired together with Docker Compose for local development.

## Backend — `server/`

### Stack

- **FastAPI** for routing and request validation
- **Python 3.12+** with **`uv`** for dependency management
- **`ruff`** for linting and formatting
- **SQLAlchemy 2.x** (async) and **Alembic** for migrations
- **PostgreSQL 16** in Docker

### Layout

```
server/app/
├── main.py            FastAPI app, CORS, router registration
├── config.py          Pydantic Settings — env-driven configuration
├── db.py              Async engine + session factory
├── auth.py            get_current_user dependency (JWT, optional dev fallback)
├── schemas.py         Pydantic request/response models
├── models/            SQLAlchemy ORM models (User, Timeline, Section, Task, ...)
├── core/
│   ├── security.py        JWT encode/decode + password hashing
│   ├── google_auth.py     Google OAuth ID-token verification
│   └── timeline_parser.py .timeline format parser
└── api/
    ├── auth.py          /api/auth — register, login, Google sign-in
    ├── timelines.py     /api/timelines — CRUD for timelines + nested entities
    └── share.py         /api/s — public/passcode-protected share links
```

### Auth model

There are two authenticated paths:

1. **Email + password** — `POST /api/auth/register`, `POST /api/auth/login`. Passwords are hashed with bcrypt (`server/app/core/security.py`). Login returns a JWT.
2. **Google sign-in** — frontend obtains a Google ID token via the JS SDK and posts it to `POST /api/auth/google`. The backend verifies it with Google's public keys, finds-or-creates a user, and returns a JWT.

The JWT is a Bearer token sent on every authenticated request. `get_current_user` decodes it and loads the user.

For local development, setting `DEV_MODE=true` lets unauthenticated requests fall through to a single seeded `dev@localhost` user. **Never enable this in production.**

### Database schema (high level)

| Table | Purpose |
| --- | --- |
| `users` | Account records (email, hashed password, OAuth provider) |
| `timelines` | Top-level timeline document |
| `sections` | Swim lanes inside a timeline |
| `tasks` | Bars on the chart, with planned and actual ranges |
| `task_dependencies` | M:N self-reference between tasks |
| `milestones` | Vertical labeled lines on the chart |
| `announcements` | Date-pinned notes |
| `share_links` | Public or passcode-protected URLs |

All IDs are UUID v4. Cascade deletes flow from `timelines` down to its children.

### API surface

```
/api/health                          GET
/api/auth/register                   POST
/api/auth/login                      POST
/api/auth/google                     POST
/api/timelines                       GET, POST           (auth required)
/api/timelines/{id}                  GET, PUT, DELETE    (auth required)
/api/timelines/{id}/sections         POST                (and similar for tasks, milestones, announcements)
/api/timelines/{id}/share            POST                (auth required)
/api/s/{slug}                        GET                 (no auth)
/api/s/{slug}/verify                 POST                (passcode check)
```

`GET /api/timelines/{id}` returns the full nested document in one round-trip.

### Migrations

Migrations are **never** auto-applied. The workflow is:

```bash
make migration msg="describe change"   # autogenerate revision
make migrate                            # apply
make migrate-down                       # roll back one
```

Always inspect the generated revision before committing.

## Frontend — `web/`

### Stack

- **React 19 + TypeScript** built with **Vite**
- **`pnpm`** for dependency management
- **`biome`** for linting and formatting
- **Tailwind CSS** + DM Sans / DM Mono
- **Framer Motion** for animation, **Lucide React** for icons
- The Gantt chart is rendered with **plain SVG** — no chart library

### Layout

```
web/src/
├── App.tsx
├── main.tsx
├── components/
│   ├── ErrorBoundary.tsx
│   ├── auth/             SignIn / Register UI
│   ├── share/            Share-link controls
│   ├── gantt/
│   │   ├── GanttChart.tsx     main container
│   │   ├── GanttBar.tsx       memoised task bar
│   │   ├── GanttHeader.tsx    zoom-aware date axis
│   │   └── TaskDetail.tsx     click-to-expand panel
│   └── timeline/
│       └── TimelineSource.tsx syntax-highlighted .timeline view
├── lib/
│   ├── api.ts                 REST client
│   ├── auth.tsx               auth context + token storage
│   ├── auth-api.ts            auth endpoints
│   ├── types.ts
│   ├── constants.ts           shared colors and status labels
│   ├── date-utils.ts          UTC helpers
│   ├── local-store.ts         localStorage drafts (local-first editor)
│   ├── timeline-parser.ts     .timeline → structured data
│   ├── timeline-serializer.ts structured data → .timeline
│   └── build-chart-timeline.ts adapts API data for the renderer
├── pages/
│   ├── Landing.tsx
│   ├── Home.tsx               authenticated dashboard
│   ├── Register.tsx
│   ├── Editor.tsx             create / edit timelines
│   └── TimelineView.tsx       Chart / Split / Source views
└── styles/
```

### Local-first editor

The editor keeps an in-progress draft in `localStorage` (`web/src/lib/local-store.ts`) so the user can iterate without a round-trip and recover after a refresh. The draft is reconciled with the server on save.

### Date handling

Everything in memory is UTC. The helpers in `date-utils.ts` are the only place we format/parse for display — please go through them rather than calling `Date` methods directly.

## The `.timeline` format

The format is parsed both client-side (`web/src/lib/timeline-parser.ts`) and server-side (`server/app/core/timeline_parser.py`). When in doubt, the parsers themselves are the spec.

A short walkthrough lives in [`README.md`](./README.md), and `examples/` contains runnable samples.

## Infrastructure

- `docker-compose.yml` runs Postgres, the API, and the web dev server.
- Health checks gate startup so `make up-build` brings up the stack in the right order.
- The `Makefile` is the single entry point for everything (`make help`).

## Configuration

All configuration is environment-based.

- **Local dev:** `server/.env.example` and `web/.env.example` are templates — copy each to `.env` (git-ignored) in the same directory. Values use literal local-dev defaults (`db:5432`, `localhost:5173`, etc.).
- **Production:** `server/.env.production.example` and `web/.env.production.example` are paste-ready blocks for Railway's Raw Editor. Their values use Railway's `${{Service.VAR}}` reference syntax, which only resolves inside Railway.

| Variable | Service | Purpose |
| --- | --- | --- |
| `DATABASE_URL` / `DATABASE_URL_SYNC` | server | Postgres connection (async + sync). Both are required: FastAPI uses async, Alembic uses sync. |
| `CORS_ORIGINS` | server | Comma-separated allowed frontend origins |
| `SECRET_KEY` | server | JWT signing key. **Override the dev default in production** (`openssl rand -hex 32`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | server | Token lifetime in minutes |
| `GOOGLE_CLIENT_ID` | server | Google ID-token verification (must match `VITE_GOOGLE_CLIENT_ID`) |
| `DEV_MODE` | server | When `true`, unauthenticated requests fall back to a seeded dev user. **Must be `false` in any deployment.** |
| `VITE_API_URL` | web | Frontend → backend base URL (read at container startup via `entrypoint.sh`) |
| `VITE_GOOGLE_CLIENT_ID` | web | Google sign-in client id (same value as `GOOGLE_CLIENT_ID`) |

## Deploying on Railway

The repo is set up to deploy as **three Railway services** in a single project: a managed Postgres, a `server` service built from `server/Dockerfile`, and a `web` service built from `web/Dockerfile`.

### Notes from the first deploy (worth knowing)

- **Service names matter for variable references.** Cross-service refs like `${{web.RAILWAY_PUBLIC_DOMAIN}}` are case-sensitive and must match the actual service name in the Railway dashboard. If you rename a service from `server` to `backend`, every reference using `${{server.…}}` silently resolves to empty. Inspect with `railway variables --service <name>` (no `--json`) — the table view shows the *resolved* values.
- **Alembic reads `DATABASE_URL_SYNC` from env**, not `alembic.ini`. The hardcoded URL in `alembic.ini` is only used for local dev where the env var isn't set. Don't be tempted to "fix" `alembic.ini` to point at a real DB — leave it as the local-dev fallback.
- **Web service exposes port 8080** (Caddy). When generating a Railway domain, pick `8080`, not `2019` (Caddy's admin port).
- **Migrations apply on startup.** `server/Dockerfile` runs `alembic upgrade head && uvicorn …` as its CMD, so each deploy migrates before the API comes up.
- **Healthcheck path is `/api/health`**, configured in `server/railway.toml`. If the migration step crashes, the healthcheck fails and Railway retries — check both build logs (`railway logs --service <name> --build`) and runtime logs (`railway logs --service <name>`).

## Roadmap (non-binding)

- OG preview images for shared links
- `.timeline` import/export endpoints
- Mobile-friendly read-only view
- Real-time collaboration (deliberately not v1 — see `MOTIVATION.md`)
