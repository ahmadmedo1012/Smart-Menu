#!/usr/bin/env bash
# round92: local PostgreSQL bootstrap (sandbox-safe).
# r97-W6: يعيد بناء نفس الخطوات بلا psql/pg_isready — عائلة embedded-postgres
# الحديثة تشحن initdb/pg_ctl/postgres فقط؛ إنشاء قاعدة smartmenu وفحص الجاهزية
# يتم عبر node + pg (متوفر في node_modules) — قابل للنقل بلا مسارات محلية.
# Binaries: /home/z/pg-native (استخراج @embedded-postgres/linux-x64/native).
# Data:    /home/z/pgdata
# Port:    5434 (matches legacy dev default in round83-seed.mjs)
# User/DB: postgres / smartmenu (trust — dev-only, localhost-only)
set -euo pipefail

PGHOME=/home/z/pg-native
export LD_LIBRARY_PATH="$PGHOME/lib:${LD_LIBRARY_PATH:-}"
DATADIR=/home/z/pgdata
PORT=5434
REPO=/home/z/my-project

if [ ! -d "$PGHOME/bin" ]; then
  echo "[pg-local] missing $PGHOME — restore via:" >&2
  echo "  mkdir -p /home/z/pg-native-src && cd /home/z/pg-native-src && npm init -y && npm i embedded-postgres@16.14.0-beta.17" >&2
  echo "  cp -r node_modules/@embedded-postgres/linux-x64/native /home/z/pg-native" >&2
  exit 1
fi

mkdir -p "$DATADIR"
if [ ! -f "$DATADIR/PG_VERSION" ]; then
  echo "[pg-local] initdb..."
  "$PGHOME/bin/initdb" -D "$DATADIR" -U postgres -A trust -E UTF8
fi

# trust local auth (dev-only, localhost-only)
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

# ensure database (node + pg — no psql binary needed)
cd "$REPO"
node -e '
const pg = require("pg");
(async () => {
  const c = new pg.Client({ connectionString: "postgres://postgres@localhost:'"$PORT"'/postgres" });
  await c.connect();
  const { rows: r } = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", ["smartmenu"]);
  if (r.length === 0) await c.query("CREATE DATABASE smartmenu OWNER postgres");
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
'
echo "[pg-local] OK → postgresql://postgres:postgres@localhost:$PORT/smartmenu"
