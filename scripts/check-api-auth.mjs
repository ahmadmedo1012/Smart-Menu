#!/usr/bin/env node
/**
 * Round85-A7 — API route authorization guard.
 *
 * Every route.ts under src/app/api must either:
 *   1. call requireAuth / requirePermission / requireAdmin (session-gated), OR
 *   2. appear in PUBLIC_ALLOWLIST below (deliberately unauthenticated
 *      endpoints — each with its own protection: rate limits, server-side
 *      price recalc, secrets, or public-by-design data), OR
 *   3. appear in SECRET_GATED (protected by CRON_SECRET / webhook secret /
 *      env bootstrap secret instead of a session).
 *
 * Run locally and in CI:  node scripts/check-api-auth.mjs
 * Exit 1 (with a report) when a route has neither marker — this catches the
 * "forgot requireAuth on a new route" class of silent regressions, since
 * src/proxy.ts does NOT block /api routes at the edge.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const API_DIR = join(ROOT, "src", "app", "api");

const AUTH_MARKERS = ["requireAuth(", "requirePermission(", "requireAdmin("];

/** Deliberately public endpoints (unauthenticated by design). */
const PUBLIC_ALLOWLIST = new Set([
  "/api/auth/login", // rate-limited, lockout, PBKDF2 verify
  "/api/auth/register", // rate-limited public self-registration
  "/api/auth/logout", // clears cookie + deletes own session row — safe unauthenticated
  "/api/loyalty", // public card lookup/create — rate-limited, PII stripped (round85-A2)
  "/api/referrals/claim", // public referral claim — rate-limited
  "/api/public/featured", // public whitelisted select, revalidate=60
  "/api/public/stats", // public aggregates, revalidate=60
  "/api/plans", // public plan catalog (cached)
  "/api/health", // liveness probe
  "/api/restaurants", // public landing list / self-registration (rate-limited)
  "/api/subscriptions/validate", // public username/slug availability check
]);

/** Protected by a shared secret instead of a user session. */
const SECRET_GATED = new Set([
  "/api/telegram/webhook", // TELEGRAM_WEBHOOK_SECRET, timing-safe
  "/api/cron/cleanup", // CRON_SECRET, timing-safe (round85-A4)
  "/api/cron/subscription-expiry", // CRON_SECRET, timing-safe (round85-A4)
  "/api/seed", // ADMIN_PASSWORD env bootstrap (throws when unset)
]);

function listRoutes(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listRoutes(full, `${prefix}/${entry}`));
    } else if (entry === "route.ts") {
      out.push({ path: prefix || "/", file: full });
    }
  }
  return out;
}

const routes = listRoutes(API_DIR);
const problems = [];
const report = [];

for (const route of routes) {
  const apiPath = `/api${route.path === "/" ? "" : route.path}`;
  const src = readFileSync(route.file, "utf8");
  const hasAuthMarker = AUTH_MARKERS.some((m) => src.includes(m));
  const isPublic = PUBLIC_ALLOWLIST.has(apiPath);
  const isSecretGated = SECRET_GATED.has(apiPath);

  if (hasAuthMarker) {
    report.push(`  ok   ${apiPath}  (session-gated)`);
  } else if (isPublic) {
    report.push(`  pub  ${apiPath}  (public by design)`);
  } else if (isSecretGated) {
    report.push(`  sec  ${apiPath}  (secret-gated)`);
  } else {
    problems.push(`${apiPath}  →  ${relative(ROOT, route.file)}`);
  }
}

console.log(`API authorization guard — ${routes.length} routes scanned\n`);
console.log(report.join("\n"));

if (problems.length > 0) {
  console.error(`\nFAIL — ${problems.length} route(s) have no auth marker and are not allowlisted:`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nAdd requireAuth()/requirePermission() to the handler, or extend the allowlist with justification.");
  process.exit(1);
}

console.log(`\nPASS — every API route is session-gated, secret-gated, or a documented public endpoint.`);
