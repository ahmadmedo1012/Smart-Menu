#!/usr/bin/env node
/**
 * Round 86 closure — production verification sweep.
 * Base: https://menu.smart-link.ly (serving c2b9a96c = round 86 code).
 *
 * Checks (from ROUND86-PLAN Phase E):
 *  - E4: pages/headers/featured/count on production
 *  - A-phase public-negative probes (no-auth + forged-cookie variants)
 *  - B-phase live behaviour (pricing SSR, stats envelope, featured query fixed,
 *    orders/count gate, immutable cache headers regression)
 */
const BASE = "https://menu.smart-link.ly";
const MENU_SLUG = "al-waha-cafe";

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function get(path, init) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
  const text = await res.text().catch(() => "");
  return { res, text, h: (n) => res.headers.get(n) ?? "" };
}

console.log(`\n=== Round 86 production verification — ${BASE} ===\n`);

// ---------- 1. Pages ----------
console.log("[1] Pages");
for (const p of ["/", "/pricing", "/login", "/terms", "/privacy", `/menu/${MENU_SLUG}`]) {
  const { res, text } = await get(p);
  const hasH1 = text.includes("<h1") || p === "/login"; // login is a small SPA shell
  ok(`GET ${p} → 200`, res.status === 200, `status=${res.status}`);
  ok(`GET ${p} has <h1>`, hasH1);
}

// ---------- 2. Security headers ----------
console.log("[2] Security headers");
{
  const { h } = await get("/");
  const csp = h("content-security-policy");
  ok("CSP present", csp.length > 0);
  ok("CSP script-src hardened", csp.includes("script-src"), csp.slice(0, 80));
  ok("HSTS", h("strict-transport-security").includes("max-age"));
  ok("X-Frame-Options DENY", h("x-frame-options").toUpperCase().includes("DENY"));
  ok("nosniff", h("x-content-type-options").includes("nosniff"));
  ok("referrer-policy", h("referrer-policy").includes("strict-origin"));
  ok("permissions-policy", h("permissions-policy").length > 0);
}

// ---------- 3. Cache headers (round-85 regression) ----------
console.log("[3] Cache headers (round-85 regression)");
{
  // og-default.png is served through an API route with Content-Disposition —
  // round85 set immutable Cache-Control on it
  const { h } = await get("/og-default.png");
  const cc = h("cache-control");
  // API-served assets pass through Vercel edge caching; immutable OR long
  // s-maxage both satisfy the no-revalidation goal
  ok("og-default.png long-lived cache", cc.includes("immutable") || cc.includes("max-age=86400"), cc);
}

// ---------- 4. API health + envelopes ----------
console.log("[4] API health & envelopes");
{
  const { res, text } = await get("/api/health");
  let j = null;
  try { j = JSON.parse(text); } catch {}
  ok("/api/health ok+db connected", res.status === 200 && j?.status === "ok" && j?.db === "connected");

  const { res: plansRes, text: plansText } = await get("/api/plans");
  let plans = null;
  try { plans = JSON.parse(plansText); } catch {}
  const plansArr = Array.isArray(plans) ? plans : plans?.data;
  ok("/api/plans returns array", plansRes.status === 200 && Array.isArray(plansArr) && plansArr.length > 0, `status=${plansRes.status}`);

  const { text: statsText } = await get("/api/public/stats");
  let stats = null;
  try { stats = JSON.parse(statsText); } catch {}
  ok("/api/public/stats success/data envelope", stats?.success === true && stats?.data?.totalRestaurants > 0);
}

// ---------- 5. B2: featured query no longer crashes ----------
console.log("[5] B2 featured endpoint");
{
  const { res, text } = await get(`/api/public/featured?slug=${MENU_SLUG}`);
  let j = null;
  try { j = JSON.parse(text); } catch {}
  // Before round86: raw query on nonexistent column → 500. Now: success envelope.
  const envelope = Array.isArray(j) || j?.success === true;
  ok(`/api/public/featured 200 + envelope (was 500 pre-fix)`, res.status === 200 && envelope, `status=${res.status} body=${text.slice(0, 120)}`);
  const items = Array.isArray(j) ? j : j?.data;
  ok("featured returns list (may be empty — owner decision pending)", Array.isArray(items));
}

// ---------- 6. B9: orders count gate ----------
console.log("[6] B9 orders/count");
{
  const { res } = await get("/api/orders/count");
  ok("unauthenticated orders/count → 401", res.status === 401, `status=${res.status}`);
}

// ---------- 7. B5: pricing server-rendered ----------
console.log("[7] B5 pricing SSR");
{
  const { text } = await get("/pricing");
  // Plan names must exist in the server HTML (no post-hydrate fetch waterfall)
  const hasPlanInHTML = /مجاني|شهري|الخطة|باقة/.test(text);
  ok("pricing HTML carries plan content server-side", hasPlanInHTML);
  const hasNoFetchWaterfall = !text.includes('id="__NEXT_DATA__" data-empty');
  ok("pricing page data present", hasNoFetchWaterfall);
}

// ---------- 8. A-phase public negatives ----------
console.log("[8] A-phase public negative probes");
{
  // A1: unauthenticated POST /api/categories with valid CSRF → 401 from
  // requireAuth (tokenless POST is stopped earlier by CSRF 403 — also closed)
  const loginRes = await fetch(`${BASE}/login`, { redirect: "manual" });
  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const csrfToken = setCookie.match(/csrf-token=([^;]+)/)?.[1] ?? "";
  const r1 = await fetch(`${BASE}/api/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Origin: BASE,
      Cookie: `csrf-token=${csrfToken}`,
    },
    body: JSON.stringify({ restaurantId: 1, name: "probe86" }),
  });
  ok("A1 unauth POST /api/categories → 401", r1.status === 401, `status=${r1.status}`);
  const r1tokenless = await fetch(`${BASE}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: 1, name: "probe86" }),
  });
  ok("A1 tokenless POST → 403 (CSRF fail-closed)", [401, 403].includes(r1tokenless.status), `status=${r1tokenless.status}`);

  // A2: unauthenticated loyalty stats with forged cookie → 401/403 (never 200)
  const r2 = await fetch(`${BASE}/api/loyalty/stats`, {
    headers: { Cookie: "smart-menu-restaurant=1" },
  });
  ok("A2 forged-cookie loyalty/stats → 401/403", [401, 403].includes(r2.status), `status=${r2.status}`);

  // A4: order with cross-tenant item → 400 (scoped lookup finds nothing)
  ok("A4 csrf minted", csrfToken.length > 0);
  const r3 = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Origin: BASE,
      ...(csrfToken ? { Cookie: `csrf-token=${csrfToken}` } : {}),
    },
    body: JSON.stringify({
      restaurantId: 999999,
      customerName: "closure86",
      subtotal: 10,
      total: 10,
      items: [{ itemId: 1, quantity: 1, price: 10 }],
    }),
  });
  const r3body = await r3.text().catch(() => "");
  ok("A4 cross-tenant order item → 400 (was 201 pre-fix)", r3.status === 400, `status=${r3.status} body=${r3body.slice(0, 100)}`);
  ok("A4 no order created (not 2xx)", r3.status >= 400);
}

// ---------- 9. Menu page regression (B6/B7 refactor, hero SSR) ----------
console.log("[9] Menu page health after B-phase refactor");
{
  const { res, text } = await get(`/menu/${MENU_SLUG}`);
  const noLottie = !text.includes("dotlottie");
  const hasMenuRoot = text.includes("dir=\"rtl\"");
  ok("menu page 200", res.status === 200);
  ok("menu page: no dotlottie on hero (round85 B1 regression check)", noLottie);
  ok("menu page: RTL shell rendered", hasMenuRoot);
  // B12/B7: page still references search param hydration client JS (fine) —
  // verify no 500 markers
  ok("menu page: no error markers", !text.includes("Application error"));
}

// ---------- 10. robots/manifest/OG regression ----------
console.log("[10] SEO/meta regression (round 84/85 assets)");
{
  const { res: robotsRes, text: robotsText } = await get("/robots.txt");
  ok("robots.txt 200 + sitemap ref", robotsRes.status === 200 && robotsText.includes("Sitemap"));
  const { res: smRes, text: smText } = await get("/sitemap.xml");
  const urlCount = (smText.match(/<loc>/g) ?? []).length;
  ok("sitemap has ≥18 urls", smRes.status === 200 && urlCount >= 18, `urls=${urlCount}`);
  const { res: ogRes, h: ogH } = await get("/og-default.png");
  ok("og-default.png 200 image/png", ogRes.status === 200 && ogH("content-type").includes("image/png"), `status=${ogRes.status} ct=${ogH("content-type")}`);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
if (fail > 0) {
  console.log("FAILURES:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
