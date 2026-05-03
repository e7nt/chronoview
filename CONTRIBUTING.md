# Contributing to Chronoview

Thank you for your interest in Chronoview. This document explains how to get a working dev environment, the conventions we follow, and the workflow for proposing changes.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms. Report unacceptable behavior to `admin@e7nt.com`.

## Ways to contribute

- **Bug reports** — open a GitHub issue with reproduction steps, expected vs actual behavior, and your environment (OS, browser, Docker version).
- **Feature ideas** — open a discussion issue first. Keep proposals scoped; Chronoview deliberately stays small (see `MOTIVATION.md` → *Explicitly Not v1*).
- **Pull requests** — for non-trivial changes, please open an issue first so we can agree on the approach before you write code.
- **Sample timelines** — interesting `.timeline` files for `examples/` are very welcome.

## Development setup

### Prerequisites

- Docker & Docker Compose
- GNU Make
- (Optional, for editor tooling) `uv` for Python and `pnpm` for Node

### First-time setup

```bash
git clone git@github.com:e7nt/chronoview.git
cd chronoview
cp .env.example .env
make up-build
make migrate
```

The app is served at http://localhost:5173 with hot reload for both backend and frontend.

### Daily commands

```bash
make up              # Start services (no rebuild)
make down            # Stop services
make logs            # Tail all logs
make logs-server     # Just backend
make logs-web        # Just frontend
make restart         # Restart everything
make ps              # Show service status
make clean           # Stop and remove volumes (resets the DB)
```

### Database & migrations

We **never** auto-apply migrations. After you change a SQLAlchemy model:

```bash
make migration msg="add foo column to tasks"
make migrate
```

Inspect generated revisions in `server/alembic/versions/` and review before committing — autogeneration is a starting point, not the final word.

### Linting & formatting

```bash
make lint            # Lint and format both server and web
make lint-server     # Python (ruff)
make lint-web        # TypeScript (biome)
```

Please run `make lint` before submitting a PR.

## Code conventions

### Python (`server/`)

- Format and lint with `ruff` (config in `server/pyproject.toml`).
- Type-hint public functions and Pydantic schemas.
- Async everywhere — `async def` route handlers, `AsyncSession` for DB.
- Keep route handlers thin; push logic into helpers under `app/core/` or model methods.

### TypeScript (`web/`)

- Format and lint with `biome`.
- Strict TypeScript — no `any` unless there is a comment explaining why.
- Tailwind utility classes for styling; shared color/status tokens live in `web/src/lib/constants.ts`.
- All dates are UTC internally — use the helpers in `web/src/lib/date-utils.ts`.

### General

- **KISS.** Prefer simple, readable code over clever abstractions.
- **No premature generalization.** Three similar lines beats a wrong abstraction.
- **Comments explain *why*, not *what*.** Well-named identifiers carry the *what*.
- **Status values** are exactly: `todo`, `in-progress`, `done`, `blocked`, `cancelled`.

## Project layout

```
chronoview/
├── server/           FastAPI backend (see ARCHITECTURE.md)
├── web/              React frontend
├── examples/         Sample .timeline files
├── docker-compose.yml
├── Makefile
└── ARCHITECTURE.md   Codebase map and design notes
```

## Pull-request workflow

1. Fork the repo and create a feature branch off `main`:
   ```bash
   git checkout -b feat/short-description
   ```
2. Make focused commits. Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`) help reviewers but are not required.
3. Run `make lint` and exercise the change in the running app before pushing.
4. Open a PR against `main`. In the description, cover:
   - **What** changed
   - **Why** (link an issue if there is one)
   - **How** to test it
   - Screenshots for any UI changes
5. A maintainer will review. Expect questions — they exist to make the change land cleanly, not to gatekeep.

### What makes a PR easy to merge

- Scope is one thing.
- The diff is small relative to the explanation in the PR body.
- New behavior is reachable from the UI or tested.
- No unrelated formatting churn.
- No secrets, API keys, or `.env` content.

## Security

Please report vulnerabilities privately — see [`SECURITY.md`](./SECURITY.md). Don't open public issues for them.

The default `secret_key` in `server/app/config.py` is a development placeholder. Production deployments **must** override `SECRET_KEY` via environment variable, and `DEV_MODE` must remain `false`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
