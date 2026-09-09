#!/usr/bin/env bash
# round93-S2: hostile-simulation e2e sweep — a variant of r92-e2e-local.sh
# that runs WITHOUT RATE_LIMIT_TEST_RELAX (real rate-limit budgets) so the
# abuser/spec-pressure specs (r93-sim-abuser) hit the genuine 429 limits.
# Starts the standalone server + runs playwright in ONE session (the sandbox
# reaps the node server between separate commands; pg_ctl-daemonized postgres
# survives, node doesn't — r88 lesson).
# Usage: bash scripts/r93-sim-hostile.sh "<playwright args after 'playwright test'>"
#   e.g. bash scripts/r93-sim-hostile.sh "tests/e2e/r93-sim-abuser.spec.ts --project=ui"
set -uo pipefail
cd /home/z/my-project

export DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu'
export JWT_SECRET='test-secret-for-ci-min-64-chars-long-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export AUTH_SECRET='test-auth-secret-for-ci-min-32-chars'
export NEXT_PUBLIC_DOMAIN='http://localhost:3000'
export NEXT_PUBLIC_WHATSAPP_NUMBER='218900000000'
export TELEGRAM_BOT_TOKEN='test'
# r93-abuser: NO RATE_LIMIT_TEST_RELAX here — real budgets by design (the
# relaxed CI server would make the 429 pressure checks unreachable).
export SEED_ADMIN_PASS='smart123' # عقد بذرة المحلية (ci-seed الافتراضي admin123456)
export BASE_URL='http://localhost:3000'

# fresh server each sweep (stale .next/standalone from a previous run is fine —
# it is rebuilt by the caller; we only ensure no zombie holds :3000)
if curl -s -o /dev/null http://localhost:3000/api/health --max-time 3; then
  echo "[sweep] server already up — reusing"
else
  echo "[sweep] starting standalone server..."
  node .next/standalone/server.js > /tmp/r92-server.log 2>&1 &
  SRV_PID=$!
  for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:3000/api/health --max-time 5; then break; fi
    sleep 1
  done
  curl -s -o /dev/null -w "[sweep] health: %{http_code}\n" http://localhost:3000/api/health --max-time 10 || { echo "[sweep] SERVER FAILED"; tail -20 /tmp/r92-server.log; exit 1; }
fi

echo "[hostile] running: node_modules/.bin/playwright test $*"  # r95-D pattern: no npx (sandbox has no global bin) — direct .bin path
eval "node_modules/.bin/playwright test $*"
RC=$?

# r97-X4: kill only a server WE started. The old `kill ${SRV_PID:-0}` fell back
# to `kill 0` (signal the whole process group) whenever a run REUSED an already
# up server — SIGTERMed the invoking shell itself (fixed in r92-e2e-local.sh
# r95-D, this copy never got it). Guarded no-op when nothing was started.
if [ -n "${SRV_PID:-}" ] && kill -0 "${SRV_PID}" 2>/dev/null; then
  kill "${SRV_PID}" 2>/dev/null || true
fi
echo "[hostile] done rc=$RC"
exit $RC
