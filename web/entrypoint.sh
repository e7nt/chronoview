#!/bin/sh
set -e

echo "Generating runtime configuration from environment variables..."
envsubst < /srv/config.template.js > /srv/config.js
echo "Runtime configuration generated successfully"

exec caddy run --config /etc/caddy/Caddyfile
