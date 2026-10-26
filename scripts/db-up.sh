#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer common local installs (Postgres.app, EnterpriseDB, Homebrew)
if [[ -x /Applications/Postgres.app/Contents/Versions/latest/bin/psql ]]; then
  export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
fi
if [[ -x /Library/PostgreSQL/18/bin/psql ]]; then
  export PATH="/Library/PostgreSQL/18/bin:$PATH"
fi
if [[ -x /opt/homebrew/opt/postgresql@16/bin/psql ]]; then
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi
if [[ -x /usr/local/opt/postgresql@16/bin/psql ]]; then
  export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found."
  echo "Install and start Postgres.app (https://postgresapp.com/), then re-run: npm run db:up"
  exit 1
fi

ENV_FILE="$ROOT/backend/.env"
ENV_EXAMPLE="$ROOT/backend/.env.example"
DEFAULT_USER="$(whoami)"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE" ]]; then
    echo "backend/.env not found — creating from backend/.env.example"
    sed "s/YOUR_MAC_USERNAME/${DEFAULT_USER}/g" "$ENV_EXAMPLE" > "$ENV_FILE"
    echo "Wrote ${ENV_FILE} (edit GOOGLE_AI_API_KEY if you want live vision)."
  else
    echo "backend/.env is missing and backend/.env.example was not found."
    echo "Create backend/.env with DATABASE_URL, then re-run: npm run db:up"
    exit 1
  fi
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_URL="${DATABASE_URL:-postgresql://${DEFAULT_USER}@127.0.0.1:5432/quality_inspection}"

IFS='|' read -r DB_HOST DB_PORT DB_USER DB_PASS DB_NAME < <(
  python3 - "$DB_URL" <<'PY'
import sys
from urllib.parse import urlparse, unquote
u = urlparse(sys.argv[1])
parts = [
  u.hostname or "127.0.0.1",
  str(u.port or 5432),
  unquote(u.username or ""),
  unquote(u.password or ""),
  (u.path or "/postgres").lstrip("/") or "postgres",
]
print("|".join(parts))
PY
)

if [[ -z "$DB_USER" ]]; then
  DB_USER="$DEFAULT_USER"
fi

export PGPASSWORD="${DB_PASS:-}"
export DATABASE_URL="$DB_URL"

echo "Using psql: $(command -v psql)"
echo "Checking PostgreSQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}…"
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "PostgreSQL is not running."
  echo "Open Postgres.app from Applications and click Start, then re-run: npm run db:up"
  exit 1
fi

echo "Ensuring database '${DB_NAME}' exists…"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE ${DB_NAME};"
  echo "Created database ${DB_NAME}."
else
  echo "Database ${DB_NAME} already exists."
fi

echo "Applying Prisma schema + seed…"
npm run migrate --prefix backend

echo "Database is ready."
echo "DATABASE_URL=${DATABASE_URL}"
