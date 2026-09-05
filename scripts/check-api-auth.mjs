#!/usr/bin/env node
/**
 * Round85-A7 / Round86-A12 — API route authorization guard (per-handler).
 *
 * Every EXPORTED HTTP handler (GET/POST/PUT/PATCH/DELETE) in every route.ts
 * under src/app/api must, within its own function body, either:
 *   1. call requireAuth / requirePermission / requireAdmin (session-gated), OR
 *   2. belong to a file in PUBLIC_ALLOWLIST below (deliberately unauthenticated
 *      endpoints — each with its own protection: rate limits, server-side
 *      price recalc, secrets, or public-by-design data), OR
 *   3. belong to a file in SECRET_GATED (protected by CRON_SECRET / webhook
 *      secret / env bootstrap secret instead of a session).
 *
 * Round86 upgrade: the round85 version checked the marker at FILE level, which
 * missed the categories POST hole (GET had requireAuth, POST did not — file
 * still "passed"). This version brace-matches each exported handler body and
 * requires the marker INSIDE it.
 *
 * Run locally and in CI:  node scripts/check-api-auth.mjs
 * Exit 1 (with a report) when any handler is ungated — catches the
 * "forgot requireAuth on one verb of a new route" class of silent regressions,
 * since src/proxy.ts does NOT block /api routes at the edge.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const API_DIR = join(ROOT, "src", "app", "api");

const AUTH_MARKERS = ["requireAuth(", "requirePermission(", "requireAdmin("];
const HANDLER_NAMES = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

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

/** Deliberately public VERBS on otherwise session-gated files (rate-limited). */
const VERB_PUBLIC_ALLOWLIST = new Map([
  // QR customers place orders without an account — rate-limited 30/min +
  // server-side price recalc + tenant-scoped items (round86-A4)
  ["/api/orders", new Set(["POST"])],
  // public referral code → restaurant lookup — rate-limited 20/min (round85-A2)
  ["/api/loyalty/referral", new Set(["GET"])],
  // public review submission — rate-limited 5/min, owner-moderated content
  ["/api/items/[id]/reviews", new Set(["POST"])],
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

/**
 * Extract the bodies of all exported HTTP handlers from a route file.
 * Uses a brace-matching scan from each `export async function VERB(`.
 */
function extractHandlerBodies(src) {
  const bodies = [];
  const re = /export\s+(?:async\s+)?function\s+([A-Z]+)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const verb = m[1];
    if (!HANDLER_NAMES.includes(verb)) continue;
    // find opening brace of the function body (after the closing paren)
    let i = m.index + m[0].length;
    let depth = 1; // inside the paren list
    while (i < src.length && depth > 0) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
      i++;
    }
    while (i < src.length && src[i] !== "{") i++;
    if (i >= src.length) continue;
    const start = i;
    let b = 0;
    for (; i < src.length; i++) {
      if (src[i] === "{") b++;
      else if (src[i] === "}") {
        b--;
        if (b === 0) break;
      }
    }
    bodies.push({ verb, body: src.slice(start, i + 1) });
  }
  return bodies;
}

const routes = listRoutes(API_DIR);
const problems = [];
const report = [];

for (const route of routes) {
  const apiPath = `/api${route.path === "/" ? "" : route.path}`;
  const src = readFileSync(route.file, "utf8");
  const isPublic = PUBLIC_ALLOWLIST.has(apiPath);
  const isSecretGated = SECRET_GATED.has(apiPath);
  if (isPublic || isSecretGated) {
    report.push(`  ${isPublic ? "pub " : "sec "} ${apiPath}  (${isPublic ? "public by design" : "secret-gated"})`);
    continue;
  }

  const handlers = extractHandlerBodies(src);
  if (handlers.length === 0) {
    // No recognizable exported handler (unusual syntax) — fall back to
    // file-level check so we never silently pass a file we failed to parse.
    const hasAuthMarker = AUTH_MARKERS.some((mk) => src.includes(mk));
    if (hasAuthMarker) report.push(`  ok   ${apiPath}  (file-level fallback)`);
    else problems.push(`${apiPath}  →  ${relative(ROOT, route.file)}  [no parsable handler & no marker]`);
    continue;
  }

  const ungated = handlers.filter(
    (h) =>
      !AUTH_MARKERS.some((mk) => h.body.includes(mk)) &&
      !VERB_PUBLIC_ALLOWLIST.get(apiPath)?.has(h.verb)
  );
  if (ungated.length === 0) {
    const gated = handlers.filter(
      (h) => AUTH_MARKERS.some((mk) => h.body.includes(mk))
    );
    report.push(
      `  ok   ${apiPath}  (${gated.map((h) => h.verb).join("/")}${
        VERB_PUBLIC_ALLOWLIST.get(apiPath)?.size ? " + public verbs allowlisted" : ""
      })`
    );
  } else {
    for (const h of ungated) {
      problems.push(`${apiPath}  →  ${relative(ROOT, route.file)}  [${h.verb} has no auth call]`);
    }
  }
}

console.log(`API authorization guard (per-handler) — ${routes.length} routes scanned\n`);
console.log(report.join("\n"));

if (problems.length > 0) {
  console.error(`\nFAIL — ${problems.length} handler(s) have no auth marker and are not allowlisted:`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nAdd requireAuth()/requirePermission() inside the handler, or extend the allowlist with justification.");
  process.exit(1);
}

console.log(`\nPASS — every exported HTTP handler is session-gated, secret-gated, or a documented public endpoint.`);
