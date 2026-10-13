#!/usr/bin/env bash
# r95-D — standalone asset sync (env-only fix, no build logic change).
# Next standalone output does NOT include .next/static or public/; without
# them the standalone server 404s every CSS/JS chunk (pages render unstyled
# and unhydrated: reveal animations never run, fonts fall back, hydration
# JS never loads). r92-e2e-local.sh calls this before starting the server.
# Idempotent — safe to run on every sweep.
set -euo pipefail
# P6-3-a: المسار القديم /home/z/my-project تقاعد مع انتقال المستودع — يُشتق
# الآن من موقع السكربت (نفس عائلة إصلاح r92-e2e-local.sh وpg-local-start.sh).
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ ! -d .next/standalone ]; then
  echo "[r95-standalone-prepare] no .next/standalone — skipping (build first)"
  exit 0
fi

# static chunks → .next/standalone/.next/static
rm -rf .next/standalone/.next/static
if [ -d .next/static ]; then
  cp -r .next/static .next/standalone/.next/static
  echo "[r95-standalone-prepare] synced .next/static ($(find .next/standalone/.next/static -type f | wc -l) files)"
fi

# public/ → .next/standalone/public (fonts, manifest, icons, offline...)
rm -rf .next/standalone/public
if [ -d public ]; then
  cp -r public .next/standalone/public
  echo "[r95-standalone-prepare] synced public/ ($(find .next/standalone/public -type f | wc -l) files)"
fi
