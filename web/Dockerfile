# Build stage
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .
RUN pnpm build

# Production stage — Caddy serves static files
FROM caddy:2.8-alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/dist /srv
COPY --from=builder /app/public/config.template.js /srv/config.template.js
COPY Caddyfile /etc/caddy/Caddyfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
