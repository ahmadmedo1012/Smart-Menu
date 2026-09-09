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
export RATE_LIMIT_TEST_RELAX='1'
export SEED_ADMIN_PASS='smart123' # عقد بذرة المحلية (ci-seed الافتراضي admin123456)
# r97: ربط عقود كلمات مرور الأدمن للفحوصات التي تقرأ متغيرات أخرى — كان
# round79-phaseC يقرأ PHASEC_ADMIN_PASS (افتراضي admin123456) بينما العقد
# المحلي smart123 → فشل دخول الأدمن داخل الرحلة. مواءمة صريحة الآن.
export PHASEC_ADMIN_PASS="$SEED_ADMIN_PASS"
export BASE_URL='http://localhost:3000'

# fresh server each sweep (stale .next/standalone from a previous run is fine —
# it is rebuilt by the caller; we only ensure no zombie holds :3000)
# r95-D: standalone asset sync — without .next/static + public copied into
# .next/standalone the server 404s every CSS/JS chunk (no hydration, reveal
# animations never run, fonts fall to Times New Roman). Env-only fix.
if [ -x scripts/r95-standalone-prepare.sh ] && [ -d .next/standalone ]; then
  bash scripts/r95-standalone-prepare.sh
fi
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

echo "[sweep] running: node_modules/.bin/playwright test $*"  # r95-D: no npx (sandbox has no global bin) — direct .bin path
eval "node_modules/.bin/playwright test $*"
RC=$?

# r95-D: kill only a server WE started. The old `kill ${SRV_PID:-0}` fell back
# to `kill 0` (signal the whole process group) whenever a run REUSED an already
# up server — SIGTERMed the invoking shell itself (tool session died, output
# lost). Guarded no-op when nothing was started by this sweep.
if [ -n "${SRV_PID:-}" ] && kill -0 "${SRV_PID}" 2>/dev/null; then
  kill "${SRV_PID}" 2>/dev/null
fi
echo "[sweep] done rc=$RC"
exit $RC
