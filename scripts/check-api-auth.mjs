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
 *      — round92-B3 — belong to a VERB-scoped entry in VERB_PUBLIC_ALLOWLIST
 *      when only SOME verbs of the file are public by design, OR
 *   3. belong to a file in SECRET_GATED (protected by CRON_SECRET / webhook
 *      secret / env bootstrap secret instead of a session).
 *
 * Round86 upgrade: the round85 version checked the marker at FILE level, which
 * missed the categories POST hole (GET had requireAuth, POST did not — file
 * still "passed"). This version brace-matches each exported handler body and
 * requires the marker INSIDE it.
 *
 * Round92-B3 upgrade: `/api/restaurants` used to sit in the FILE-level
 * PUBLIC_ALLOWLIST although only its POST (public self-registration, rate
 * limited 5/min) is public — its GET is session-gated with
 * requirePermission('VIEW_ANALYTICS') (restaurants/route.ts:64). A file-level
 * exemption means a future regression that drops the GET gate would pass this
 * guard silently. The entry moved to VERB_PUBLIC_ALLOWLIST (POST only), so the
 * guard now brace-checks GET/PUT/PATCH/DELETE of that file like any other.
 *
 * Run locally and in CI:  node scripts/check-api-auth.mjs
 * Self-test of the decision logic:  node scripts/check-api-auth.mjs --self-test
 * (the pure functions are also imported by tests/unit/r92-check-api-auth-verbs.test.ts)
 * Exit 1 (with a report) when any handler is ungated — catches the
 * "forgot requireAuth on one verb of a new route" class of silent regressions,
 * since src/proxy.ts does NOT block /api routes at the edge.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const API_DIR = join(ROOT, "src", "app", "api");

const AUTH_MARKERS = ["requireAuth(", "requirePermission(", "requireAdmin("];
const HANDLER_NAMES = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

/** Deliberately public endpoints (unauthenticated by design — whole file). round92-B3: exported for unit tests. */
export const PUBLIC_ALLOWLIST = new Set([
  "/api/auth/login", // rate-limited, lockout, PBKDF2 verify
  "/api/auth/register", // rate-limited public self-registration
  "/api/auth/logout", // clears cookie + deletes own session row — safe unauthenticated
  "/api/loyalty", // public card lookup/create — rate-limited, PII stripped (round85-A2)
  "/api/referrals/claim", // public referral claim — rate-limited
  "/api/public/featured", // public whitelisted select, revalidate=60
  "/api/public/stats", // public aggregates, revalidate=60
  "/api/public/menu/[slug]", // r100: public single round-trip menu payload for the RN app — DB rate-limited 60/min/IP BEFORE any query (incl. the 404 path), slug regex guard, isActive-only select
  "/api/plans", // public plan catalog (cached)
  "/api/health", // liveness probe
  // round92-B3: "/api/restaurants" REMOVED from here — only its POST is public
  // (see VERB_PUBLIC_ALLOWLIST below). GET is requirePermission('VIEW_ANALYTICS').
  "/api/subscriptions/validate", // public username/slug availability check
]);

/**
 * round92-B3: deliberately public VERBS on otherwise session-gated files.
 * Format: "/api/path" → Set of public HTTP verbs (each with its own guard:
 * rate limit + server-side validation). Every OTHER exported verb of the file
 * is brace-checked for an auth marker exactly like any unlisted route.
 * Exported for unit tests.
 */
export const VERB_PUBLIC_ALLOWLIST = new Map([
  // QR customers place orders without an account — rate-limited 30/min +
  // server-side price recalc + tenant-scoped items (round86-A4)
  ["/api/orders", new Set(["POST"])],
  // public referral code → restaurant lookup — rate-limited 20/min (round85-A2)
  ["/api/loyalty/referral", new Set(["GET"])],
  // public review submission — rate-limited 5/min, owner-moderated content
  ["/api/items/[id]/reviews", new Set(["POST"])],
  // round92-B3 (moved from PUBLIC_ALLOWLIST): public self-registration POST —
  // rate-limited 5/min + round-76/87 mass-assignment and maxMenus guards.
  // GET is NOT public: admin/PII listing, requirePermission('VIEW_ANALYTICS').
  ["/api/restaurants", new Set(["POST"])],
]);

/** Protected by a shared secret instead of a user session. */
const SECRET_GATED = new Set([
  "/api/telegram/webhook", // TELEGRAM_WEBHOOK_SECRET, timing-safe
  "/api/cron/cleanup", // CRON_SECRET, timing-safe (round85-A4)
  "/api/cron/subscription-expiry", // CRON_SECRET, timing-safe (round85-A4)
  "/api/seed", // ADMIN_PASSWORD env bootstrap (throws when unset)
]);

/**
 * round92-B3: the pure decision core, exported for unit tests + --self-test.
 * Given a route path and its extracted handler bodies, return the handlers
 * that have NO auth marker inside their body and are NOT verb-allowlisted.
 */
export function findUngatedHandlers(apiPath, handlers) {
  return handlers.filter(
    (h) =>
      !AUTH_MARKERS.some((mk) => h.body.includes(mk)) &&
      !VERB_PUBLIC_ALLOWLIST.get(apiPath)?.has(h.verb)
  );
}

/** round92-B3: file-level exemption test (whole-file public or secret-gated). */
export function isRouteExempt(apiPath) {
  return PUBLIC_ALLOWLIST.has(apiPath) || SECRET_GATED.has(apiPath);
}

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
 * (round92-B3: exported for unit tests / self-test.)
 */
export function extractHandlerBodies(src) {
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

/**
 * round92-B3: --self-test — pins the decision logic (and the B3 move itself)
 * with assertions on the pure core. Run: node scripts/check-api-auth.mjs --self-test
 */
function selfTest() {
  const failures = [];
  const check = (label, cond) => {
    if (!cond) failures.push(label);
  };

  // 1) B3 invariant: /api/restaurants is NOT file-level public anymore…
  check("B3: /api/restaurants must NOT be in PUBLIC_ALLOWLIST", !PUBLIC_ALLOWLIST.has("/api/restaurants"));
  // …but its POST verb stays allowlisted (public self-registration).
  check("B3: /api/restaurants POST must stay verb-allowlisted", VERB_PUBLIC_ALLOWLIST.get("/api/restaurants")?.has("POST"));

  // 2) A GET handler without an auth marker on /api/restaurants must be a
  //    violation — this is the exact regression the old file-level exemption
  //    would have masked (the guard now brace-checks that verb).
  const ungatedGet = findUngatedHandlers("/api/restaurants", [
    { verb: "GET", body: "const data = await listAllRestaurants(); return json(data);" },
  ]);
  check("B3: ungated /api/restaurants GET is flagged", ungatedGet.length === 1 && ungatedGet[0].verb === "GET");

  // 3) The public POST verb is not a violation even without an auth marker.
  check(
    "B3: verb-allowlisted /api/restaurants POST passes",
    findUngatedHandlers("/api/restaurants", [{ verb: "POST", body: "const ip = getClientIp(req);" }]).length === 0
  );

  // 4) A gated GET (the real route shape: requirePermission('VIEW_ANALYTICS'))
  //    is not a violation.
  check(
    "B3: gated /api/restaurants GET passes",
    findUngatedHandlers("/api/restaurants", [
      { verb: "GET", body: "const auth = await requirePermission('VIEW_ANALYTICS');" },
    ]).length === 0
  );

  // 5) /api/orders: POST allowlisted, GET must carry an auth marker.
  check("orders: allowlisted POST passes", findUngatedHandlers("/api/orders", [{ verb: "POST", body: "await create();" }]).length === 0);
  check("orders: ungated GET is flagged", findUngatedHandlers("/api/orders", [{ verb: "GET", body: "await list();" }]).length === 1);

  // 6) Fully public file (health) never reaches handler parsing.
  check("health is file-level exempt", isRouteExempt("/api/health"));

  // 7) extractHandlerBodies: the brace matcher returns both verbs with full bodies.
  const bodies = extractHandlerBodies(
    'export async function GET() {\n  const auth = await requireAuth();\n  if (x) { return 1; }\n}\nexport async function POST(r) {\n  return 2;\n}\n'
  );
  check("extract: two handlers found", bodies.length === 2);
  check("extract: GET body contains requireAuth", bodies[0]?.body.includes("requireAuth("));
  check("extract: nested braces stay inside the body", bodies[0]?.body.includes("if (x)"));

  if (failures.length > 0) {
    console.error(`SELF-TEST FAIL — ${failures.length} assertion(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("SELF-TEST PASS — 11 assertions on the round92-B3 verb-level decision core.");
}

function main() {
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

    const ungated = findUngatedHandlers(apiPath, handlers);
    if (ungated.length === 0) {
      const gated = handlers.filter((h) => AUTH_MARKERS.some((mk) => h.body.includes(mk)));
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
}

// round92-B3: run as a CLI (node scripts/check-api-auth.mjs [--self-test]);
// under vitest import (tests/unit/r92-check-api-auth-verbs.test.ts) the module
// only exposes the pure functions with zero filesystem side effects.
const invokedAsCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsCli) {
  if (process.argv.includes("--self-test")) selfTest();
  else main();
}
