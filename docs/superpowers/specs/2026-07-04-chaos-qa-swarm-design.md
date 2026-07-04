# Chaos QA Swarm — Autonomous Self-Healing E2E Regression

**Date**: 2026-07-04
**Target**: https://smart-menu-sigma.vercel.app/
**Mode**: Production live, experimental data acceptable

## Architecture

Single Workflow orchestrating 4 phases in parallel, then self-heal loop.

### Phase 1 — Surface Crawl (Playwright)
- Visit all public/owner/admin routes on Vercel live
- Click every button, fill inputs, toggle switches
- Malicious inputs (HTML injection, SQL injection, empty fields, negatives)
- Screenshot per route

### Phase 2 — Auth Penetration
- No-cookie access to protected routes → expect redirect
- SUB_ADMIN cookie on admin-only routes → expect 403
- OWNER cookie on admin routes → expect redirect
- Expired/tampered JWT → expect reject

### Phase 3 — Telemetry
- Capture all console.errors, 4xx/5xx, slow requests (>3s)
- Log to TELEMETRY_BUG_REPORT.md

### Phase 4 — Self-Heal
- On failure → grep local code → patch → verify build
- Update telemetry with [FIXED] badge

## Termination
- All routes pass, zero console errors
- All TELEMETRY entries [FIXED]
- `npm run lint && npm run build` pass locally
