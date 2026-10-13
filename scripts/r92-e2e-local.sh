#!/usr/bin/env bash
# round92: local e2e sweep — starts the standalone server + runs playwright in
# ONE session (the sandbox reaps the node server between separate commands;
# pg_ctl-daemonized postgres survives, node doesn't — r88 lesson).
# Usage: bash scripts/r92-e2e-local.sh "<playwright args after 'playwright test'>"
#   e.g. bash scripts/r92-e2e-local.sh "tests/e2e/team8-featured.spec.ts --project=qa-teams"
# RUNBOOK الكاملة المحلية (P6-3-aR — مثبتة خضراء على بوابات كروم الأربع):
#   0. bash scripts/pg-local-start.sh          # postgres على 5434 (يثبّت عبر pg_ctl)
#   1. npx prisma migrate deploy (DATABASE_URL أدناه) + node scripts/ci-seed.mjs
#      + node scripts/round83-seed.mjs + node scripts/r93-sim-seed.mjs
#      (qa-seed.mjs لمسار q4-add-cart-stress — idempotent كلها)
#   2. npx prisma generate && npx next build   # ثم r95-standalone-prepare يتكفل بالأصول
#   3. الرحلة الكاملة إما دفعة واحدة:
#      bash scripts/r92-e2e-local.sh "tests/e2e tests/security --project=security --project=api --project=ui --project=auth-verify"
#      أو قطعةً قطعة (أضمن لصندوق ضيق الذاكرة — ملف/ملفان لكل استدعاء):
#      bash scripts/r92-e2e-local.sh "tests/security --project=security --project=auth-verify"
#      bash scripts/r92-e2e-local.sh "tests/e2e/api-smoke.test.ts tests/e2e/api-sweep.test.ts --project=api"
#      ... الخ — السكربت يقتل الخادم الذي بدأه هو في نهاية كل استدعاء.
# P6-3-a: (1) المسار القديم /home/z/my-project تقاعد مع انتقال المستودع إلى
# /home/z/repos/Smart-Menu — يُشتق الآن من موقع السكربت فيصمد أمام أي انتقال.
# (2) البوابة 3000 محجوزة لmission-control و3111-3113 لوكلاء آخرين — الرحلة
# المحلية تنزل على 3114 (قاعدة المنافذ) عبر PORT للخادم + BASE_URL للفحوصات،
# قابل للتخصيص: E2E_PORT=3115 bash scripts/r92-e2e-local.sh "..."
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

E2E_PORT="${E2E_PORT:-3114}"
# P6-3-aR: عامل واحد افتراضيًا — عاملا الافتراضي المحلي (2) يفتحان كروميوم
# متوازيين فترتفع ذاكرة الصندوق (4GB) ويرسل مراقب userspace إشارة SIGTERM
# إلى خادم standalone في منتصف الرحلة (قتل صامت بلا OOM في dmesg —
# SERVER_EXITED code=143 هو الدليل) فتنهار كل الفحوص اللاحقة بـ
# ECONNRESET/ECONNREFUSED الجماعية — تبدو أعطال منتج وهي ليست كذلك.
# بعامل واحد (كروم واحد) عبرت الرحلات الكاملة للبوابات الأربع خضراء
# (P6-3-aR: security/api/ui/auth-verify كاملة). المتصل يتجاوز ذلك بتمرير
# --workers صريح، أو E2E_WORKERS=2 عند ذاكرة أرحب.
E2E_WORKERS="${E2E_WORKERS:-1}"

export DATABASE_URL='postgresql://postgres:postgres@localhost:5434/smartmenu'
export JWT_SECRET='test-secret-for-ci-min-64-chars-long-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export AUTH_SECRET='test-auth-secret-for-ci-min-32-chars'
export NEXT_PUBLIC_DOMAIN="http://localhost:$E2E_PORT"
export NEXT_PUBLIC_WHATSAPP_NUMBER='218900000000'
export TELEGRAM_BOT_TOKEN='test'
# P6-3-a: فكّ تخطي فحوصي webhook-security (3 فحوص تقفز بلا سرّ)
# وHSTS (فحصان في full-sweep/ui-sweep يقفزان بلا وسم وضع الخادم) —
# الخادم المحلي standalone يعمل أصلًا بNODE_ENV=production فهذه ليست
# محاكاة وضع بل توثيق الواقع؛ تغطية أعلى بلا تغيير أي توكيد.
export TELEGRAM_WEBHOOK_SECRET='test-webhook-secret-for-local-e2e'
export E2E_SERVER_MODE='production'
export RATE_LIMIT_TEST_RELAX='1'
export SEED_ADMIN_PASS='smart123' # عقد بذرة المحلية (ci-seed الافتراضي admin123456)
# r97: ربط عقود كلمات مرور الأدمن للفحوصات التي تقرأ متغيرات أخرى — كان
# round79-phaseC يقرأ PHASEC_ADMIN_PASS (افتراضي admin123456) بينما العقد
# المحلي smart123 → فشل دخول الأدمن داخل الرحلة. مواءمة صريحة الآن.
export PHASEC_ADMIN_PASS="$SEED_ADMIN_PASS"
export BASE_URL="http://localhost:$E2E_PORT"

# fresh server each sweep (stale .next/standalone from a previous run is fine —
# it is rebuilt by the caller; we only ensure no zombie holds the port)
# r95-D: standalone asset sync — without .next/static + public copied into
# .next/standalone the server 404s every CSS/JS chunk (no hydration, reveal
# animations never run, fonts fall to Times New Roman). Env-only fix.
if [ -x scripts/r95-standalone-prepare.sh ] && [ -d .next/standalone ]; then
  bash scripts/r95-standalone-prepare.sh
fi
if curl -s -o /dev/null "http://localhost:$E2E_PORT/api/health" --max-time 3; then
  echo "[sweep] server already up — reusing"
else
  echo "[sweep] starting standalone server on :$E2E_PORT..."
  PORT="$E2E_PORT" HOSTNAME=localhost node .next/standalone/server.js > /tmp/r92-server.log 2>&1 &
  SRV_PID=$!
  for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$E2E_PORT/api/health" --max-time 5; then break; fi
    sleep 1
  done
  curl -s -o /dev/null -w "[sweep] health: %{http_code}\n" "http://localhost:$E2E_PORT/api/health" --max-time 10 || { echo "[sweep] SERVER FAILED"; tail -20 /tmp/r92-server.log; exit 1; }
fi

# P6-3-aR: حقن --workers الافتراضي (انظر التعليق أعلاه) ما لم يحدده المتصل.
if [[ " $* " != *" --workers"* ]]; then
  set -- "$@" "--workers=$E2E_WORKERS"
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
