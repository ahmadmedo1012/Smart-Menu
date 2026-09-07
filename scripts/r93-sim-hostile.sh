#!/usr/bin/env bash
# round92: local e2e sweep — starts the standalone server + runs playwright in
# ONE session (the sandbox reaps the node server between separate commands;
# pg_ctl-daemonized postgres survives, node doesn't — r88 lesson).
# Usage: bash scripts/r92-e2e-local.sh "<playwright args after 'playwright test'>"
#   e.g. bash scripts/r92-e2e-local.sh "tests/e2e/team8-featured.spec.ts --project=qa-teams"
set -uo pipefail
cd /home/z/my-project

export DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu'
export JWT_SECRET='test-secret-for-ci-min-64-chars-long-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export AUTH_SECRET='test-auth-secret-for-ci-min-32-chars'
export NEXT_PUBLIC_DOMAIN='http://localhost:3000'
export NEXT_PUBLIC_WHATSAPP_NUMBER='218900000000'
export TELEGRAM_BOT_TOKEN='test'
export # (r93-abuser: بلا ترخيص — الميزانيات الحقيقية)
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

echo "[sweep] running: npx playwright test $*"
eval "npx playwright test $*"
RC=$?

kill ${SRV_PID:-0} 2>/dev/null
echo "[sweep] done rc=$RC"
exit $RC
