#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# dev-local.sh — Start the full Nords stack locally
#
#   1. Cloud SQL Proxy  →  tunnels to the remote Postgres DB
#   2. Verify DB        →  confirms Postgres is reachable
#   3. Server           →  Express API on :3000
#   4. Client           →  Vite dev server on :5173
#   5. Opens Chrome     →  http://localhost:5173
#
# Usage:
#   ./scripts/dev-local.sh            # normal start
#   ./scripts/dev-local.sh --no-open  # skip opening Chrome
#
# Stop everything:  Ctrl-C  (sends SIGINT → cleanup trap)
# ──────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPEN_BROWSER=true
[[ "${1:-}" == "--no-open" ]] && OPEN_BROWSER=false

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Config ──
INSTANCE="nords-spatial-1776012153:us-central1:nords-db-main"
PROXY_PORT=5433
SERVER_PORT=3000
CLIENT_URL="http://localhost:5173"

# ── Load server env (source it so child processes inherit) ──
SERVER_ENV="$ROOT_DIR/server/.env"
if [[ ! -f "$SERVER_ENV" ]]; then
  echo -e "${RED}✘  Missing server/.env — copy from server/.env.example and configure.${RESET}"
  exit 1
fi
set -a  # auto-export all sourced variables
# shellcheck disable=SC1090
source "$SERVER_ENV"
set +a

# ── Validate required env vars ──
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo -e "${RED}✘  DATABASE_URL is not set in server/.env${RESET}"
  exit 1
fi

# ── PID tracking for cleanup ──
PROXY_PID=""
SERVER_PID=""
CLIENT_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Shutting down...${RESET}"
  for pid in $CLIENT_PID $SERVER_PID $PROXY_PID; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Also kill any child processes we may have spawned
  pkill -P $$ 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}✔  All processes stopped.${RESET}"
}
trap cleanup EXIT INT TERM

# ── Helper: wait for a TCP port to accept connections ──
wait_for_port() {
  local port=$1 label=$2 timeout=${3:-30}
  local elapsed=0
  echo -e "${DIM}   Waiting for ${label} on port ${port}...${RESET}"
  while ! nc -z 127.0.0.1 "$port" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [[ $elapsed -ge $timeout ]]; then
      echo -e "${RED}✘  Timed out waiting for ${label} on port ${port} after ${timeout}s${RESET}"
      exit 1
    fi
  done
  echo -e "${GREEN}✔  ${label} is ready on port ${port}${RESET}"
}

# ── Helper: verify actual Postgres connectivity ──
verify_db() {
  local timeout=${1:-15}
  local elapsed=0
  echo -e "${DIM}   Verifying Postgres responds to queries...${RESET}"
  while true; do
    # Use psql if available, otherwise use node to test the connection
    if command -v psql &>/dev/null; then
      if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
        echo -e "${GREEN}✔  Postgres connection verified${RESET}"
        return 0
      fi
    else
      # Fallback: use node + pg to test
      if node -e "
        const pg = require('pg');
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
        pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => { pool.end(); process.exit(1); });
      " 2>/dev/null; then
        echo -e "${GREEN}✔  Postgres connection verified${RESET}"
        return 0
      fi
    fi
    sleep 1
    elapsed=$((elapsed + 1))
    if [[ $elapsed -ge $timeout ]]; then
      echo -e "${RED}✘  Postgres is not responding after ${timeout}s${RESET}"
      echo -e "${RED}   DATABASE_URL host: $(echo "$DATABASE_URL" | sed 's|.*@\(.*\)/.*|\1|')${RESET}"
      echo -e "${RED}   Check your GCP credentials: gcloud auth application-default login${RESET}"
      exit 1
    fi
  done
}

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║     🚀  Nords Local Dev Stack       ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${RESET}"
echo ""
echo -e "${DIM}   DATABASE_URL → $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***@|')${RESET}"
echo ""

# ──────────────────────────────────────
# 1. Cloud SQL Proxy
# ──────────────────────────────────────
echo -e "${CYAN}[1/5]${RESET} Starting Cloud SQL Proxy → ${DIM}${INSTANCE}${RESET}"

if ! command -v cloud-sql-proxy &>/dev/null; then
  echo -e "${RED}✘  cloud-sql-proxy not found. Install: brew install cloud-sql-proxy${RESET}"
  exit 1
fi

if nc -z 127.0.0.1 "$PROXY_PORT" 2>/dev/null; then
  echo -e "${YELLOW}   ⚠  Port ${PROXY_PORT} already in use — assuming proxy is already running.${RESET}"
else
  cloud-sql-proxy "$INSTANCE" --port="$PROXY_PORT" &>/dev/null &
  PROXY_PID=$!
  wait_for_port "$PROXY_PORT" "Cloud SQL Proxy" 20
fi

# ──────────────────────────────────────
# 2. Verify DB connectivity
# ──────────────────────────────────────
echo -e "${CYAN}[2/5]${RESET} Verifying database connectivity"
verify_db 15

# ──────────────────────────────────────
# 3. API Server
# ──────────────────────────────────────
echo -e "${CYAN}[3/5]${RESET} Starting API server → ${DIM}http://localhost:${SERVER_PORT}${RESET}"

cd "$ROOT_DIR/server"
# Note: we already sourced .env above and exported all vars,
# so tsx gets them via the environment. Don't rely on --env-file.
npx tsx watch src/index.ts &
SERVER_PID=$!
wait_for_port "$SERVER_PORT" "API server" 30

# Quick smoke test: hit /health
HEALTH=$(curl -sf http://localhost:${SERVER_PORT}/health 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok"'; then
  echo -e "${GREEN}✔  API health check passed${RESET}"
else
  echo -e "${RED}✘  API health check failed: ${HEALTH}${RESET}"
  exit 1
fi

# ──────────────────────────────────────
# 4. Vite Client
# ──────────────────────────────────────
echo -e "${CYAN}[4/5]${RESET} Starting Vite dev server → ${DIM}${CLIENT_URL}${RESET}"

cd "$ROOT_DIR/client"
npx vite --host &
CLIENT_PID=$!
wait_for_port 5173 "Vite dev server" 20

# ──────────────────────────────────────
# 5. Open Chrome
# ──────────────────────────────────────
if $OPEN_BROWSER; then
  echo -e "${CYAN}[5/5]${RESET} Opening Chrome → ${DIM}${CLIENT_URL}${RESET}"
  sleep 1  # let Vite finish initial compilation
  open -a "Google Chrome" "$CLIENT_URL" 2>/dev/null || open "$CLIENT_URL" 2>/dev/null || true
else
  echo -e "${CYAN}[5/5]${RESET} Skipping browser open ${DIM}(--no-open)${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}✔  All services running!${RESET}"
echo -e "   ${DIM}API:     http://localhost:${SERVER_PORT}${RESET}"
echo -e "   ${DIM}Swagger: http://localhost:${SERVER_PORT}/api-docs${RESET}"
echo -e "   ${DIM}Client:  ${CLIENT_URL}${RESET}"
echo -e ""
echo -e "   ${YELLOW}Press Ctrl-C to stop all services.${RESET}"
echo ""

# Keep the script alive so the trap works on Ctrl-C
wait
