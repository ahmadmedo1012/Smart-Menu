#!/usr/bin/env bash
# round92: local PostgreSQL bootstrap (sandbox-safe).
# Uses embedded-postgres native binaries (no root/docker needed).
# Data:    /home/z/pgdata
# Port:    5434 (matches legacy dev default in round83-seed.mjs)
# User/DB: postgres / smartmenu (password: postgres)
set -euo pipefail

PGHOME=/home/z/pg-embedded/node_modules/@embedded-postgres/linux-x64/native
export LD_LIBRARY_PATH="$PGHOME/lib:${LD_LIBRARY_PATH:-}"
DATADIR=/home/z/pgdata
PORT=5434

mkdir -p "$DATADIR"
if [ ! -f "$DATADIR/PG_VERSION" ]; then
  echo "[pg-local] initdb..."
  "$PGHOME/bin/initdb" -D "$DATADIR" -U postgres --pwfile=<(echo postgres) -E UTF8 --no-inet 2>/dev/null || \
  "$PGHOME/bin/initdb" -D "$DATADIR" -U postgres -A trust -E UTF8
fi

# trust local auth for the dev user (dev-only, localhost-only)
{
  echo "local all all trust"
  echo "host all all 127.0.0.1/32 trust"
  echo "host all all ::1/128 trust"
} > "$DATADIR/pg_hba.conf"

if "$PGHOME/bin/pg_ctl" -D "$DATADIR" status >/dev/null 2>&1; then
  echo "[pg-local] already running"
else
  echo "[pg-local] starting on port $PORT..."
  "$PGHOME/bin/pg_ctl" -D "$DATADIR" -o "-p $PORT -k /tmp -c listen_addresses=localhost" -l /tmp/pg-local.log start
fi

# ensure dev user + database
"$PGHOME/bin/psql" -h localhost -p "$PORT" -U postgres -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1 || true
"$PGHOME/bin/psql" -h localhost -p "$PORT" -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='smartmenu'" | grep -q 1 || \
  "$PGHOME/bin/psql" -h localhost -p "$PORT" -U postgres -d postgres -c "CREATE DATABASE smartmenu OWNER postgres"

"$PGHOME/bin/pg_isready" -h localhost -p "$PORT"
echo "[pg-local] OK → postgresql://postgres:postgres@localhost:$PORT/smartmenu"
