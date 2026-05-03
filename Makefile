.PHONY: help up down build logs restart ps clean \
       db-shell server-shell web-shell \
       migration migrate migrate-down \
       lint lint-server lint-web \
       test test-server

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
up: ## Start all services
	docker compose up -d

up-build: ## Start all services with rebuild
	docker compose up -d --build

down: ## Stop all services
	docker compose down

build: ## Build all images
	docker compose build

logs: ## Tail logs for all services
	docker compose logs -f

logs-server: ## Tail server logs
	docker compose logs -f server

logs-web: ## Tail web logs
	docker compose logs -f web

restart: ## Restart all services
	docker compose restart

ps: ## Show running services
	docker compose ps

clean: ## Stop services and remove volumes
	docker compose down -v

# Database
db-shell: ## Open psql shell
	docker compose exec db psql -U timelines -d timelines

# Migrations (run against containerized DB)
migration: ## Generate migration (usage: make migration msg="description")
	docker compose exec server uv run alembic revision --autogenerate -m "$(msg)"

migrate: ## Apply all pending migrations
	docker compose exec server uv run alembic upgrade head

migrate-down: ## Rollback one migration
	docker compose exec server uv run alembic downgrade -1

# Shells
server-shell: ## Open shell in server container
	docker compose exec server bash

web-shell: ## Open shell in web container
	docker compose exec web sh

# Linting
lint-server: ## Lint and format Python code
	docker compose exec server uv run ruff check app/ --fix
	docker compose exec server uv run ruff format app/

lint-web: ## Lint and format TypeScript code
	docker compose exec web pnpm biome check --write src/

lint: lint-server lint-web ## Lint all code
