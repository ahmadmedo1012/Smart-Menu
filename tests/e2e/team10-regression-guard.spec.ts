/**
 * Team 10 — Regression guard: the crown-jewel behaviors of rounds 79-87,
 * as fast localhost spec checks (ideas distilled from
 * scripts/round87-prod-verify.mjs, but running against the LOCAL server
 * so they gate every CI run, not just production deploys).
 *
 * Guarded behaviors (round → check):
 *   - round87-B5: the root 404 boundary is SLIM — brand + suggestions +
 *     ThemeToggle, but NO landing Header (it compiled into every route's
 *     client manifest, ~10KB gz per page).
 *   - round87-D10: service worker cache version is smart-menu-v6 with the
 *     bounded LRU image cache.
 *   - round87-B10: promo.mp4 is served as the re-encoded ~150KB video (not
 *     the 1.09MB original) with the video/mp4 content type.
 *   - round87-D4: /menu/[slug]/print exists and renders menu content.
 *   - round87-B6: the admin system-events sinceId cursor returns ONLY
 *     additions (id > sinceId, strictly) — the 15s notifier poll contract.
 *   - round85: baseline security headers (X-Frame-Options DENY, nosniff,
 *     CSP) on both pages and API responses.
 *
 * localhost-only (writes two guard SystemEvents): requires BASE_URL server
 * + ci-seed (admin) + round83-seed (al-waha-cafe).
 * Run: npx playwright test tests/e2e/team10-regression-guard.spec.ts --project=qa-teams
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const RUNTIME_HOST = "localhost";
const raw = process.env.BASE_URL || `http://${RUNTIME_HOST}:3000`;
const u = new URL(raw.replace(/\/+$/, ""));
if (u.hostname === "127.0.0.1") u.hostname = RUNTIME_HOST;
const BASE = u.origin;

const ts = Date.now().toString().slice(-8);

/** Login as the ci-seed admin and return a session cookie value + fresh csrf pair. */
async function adminLogin(
  request: APIRequestContext
): Promise<{ session: string; csrf: { token: string; cookie: string } }> {
  const csrf = await mintCsrfPair(request);
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, csrf) },
    data: {
      username: "admin",
      password: process.env.SEED_ADMIN_PASS || "admin123456",
    },
  });
  expect(res.status()).toBe(200);
  // The request fixture's jar does not reliably persist Set-Cookie — carry
  // the session explicitly (same workaround as csrf-helper).
  const setCookie = res.headers()["set-cookie"] ?? "";
  const session = setCookie.match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
  expect(session).not.toBe("");
  return { session, csrf };
}

/** POST a uniquely-titled guard SystemEvent as admin (double-submit CSRF). */
async function createGuardEvent(
  request: APIRequestContext,
  session: string,
  csrf: { token: string; cookie: string },
  label: string
): Promise<number> {
  const res = await request.post(`${BASE}/api/admin/system-events`, {
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.token,
      Cookie: `csrf-token=${csrf.token}; smart-menu-session=${session}`,
      Origin: BASE,
    },
    data: {
      eventType: "info",
      title: `team10-sinceid-guard-${label}-${ts}`,
      message: "regression guard fixture (team10)",
      severity: "info",
    },
  });
  expect(res.status()).toBe(201);
  const json = (await res.json()) as { success?: boolean; data?: { id?: number } };
  expect(json.success).toBe(true);
  expect(typeof json.data?.id).toBe("number");
  return json.data!.id!;
}

async function getEventsSince(
  request: APIRequestContext,
  session: string,
  sinceId: number
): Promise<{ status: number; body: { success?: boolean; sinceId?: number; data?: { id: number }[] } }> {
  const res = await request.get(`${BASE}/api/admin/system-events?sinceId=${sinceId}`, {
    headers: { Cookie: `smart-menu-session=${session}` },
  });
  // round88 closure fix: the sinceId branch returns success({ data, sinceId })
  // — the standard envelope wraps it as body.data = { data: rows, sinceId }.
  // (Without sinceId the route returns the paginated shape body.data.data.)
  // Unify BOTH here so callers always see body.data = rows + body.sinceId.
  const raw = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    sinceId?: number;
    data?: { id: number }[] | { data?: { id: number }[]; sinceId?: number };
  };
  const nested = raw.data as { data?: { id: number }[]; sinceId?: number } | undefined;
  const rows = Array.isArray(raw.data)
    ? (raw.data as { id: number }[])
    : (nested?.data ?? []);
  return {
    status: res.status(),
    body: {
      success: raw.success,
      sinceId: raw.sinceId ?? nested?.sinceId,
      data: rows,
    },
  };
}

test.describe("team10: regression guard — rounds 79-87 crown jewels", () => {
  // ── round87-B5: slim 404 ──────────────────────────────────────────────
  test("404 boundary: status + brand + suggestions, NO landing Header nav", async ({ request }) => {
    const res = await request.get(`${BASE}/definitely-not-a-page-team10-${ts}`, {
      headers: { Accept: "text/html" },
    });
    expect(res.status()).toBe(404);
    const html = await res.text();

    // Positive: the minimal branded boundary
    expect(html).toContain("الصفحة غير موجودة");
    // r93-U8: توحيد تسمية العلامة الظاهرة — «الربط الذكي» هو المهيمن في
    // المشروع (21+ موضعًا)؛ كانت هذه الصفحة الموضع الوحيد لـ«سمارت مينيو»
    expect(html).toContain("الربط الذكي");

    // Negative: the full landing Header must NOT ship in the 404 document —
    // its nav landmarks and the heavy hero decorations only exist in the
    // landing Header/Hero chunks. NOTE (round88 closure fix): the slim 404's
    // OWN brand Link legitimately carries aria-label="الرئيسية" (not-found.tsx
    // brand link) — the landing-Header-unique marker is the NAV element with
    // that label, so assert on '<nav aria-label="الرئيسية"' instead.
    expect(html).not.toContain('قائمة التصفح');
    expect(html).not.toContain('<nav aria-label="الرئيسية"');
    expect(html).not.toContain("HeroDecor");
    expect(html).not.toContain("hero-lottie");
  });

  // ── round87-D10: service worker version + LRU ─────────────────────────
  test("sw.js carries the smart-menu-v6 cache version with a bounded LRU image cache", async ({ request }) => {
    const res = await request.get(`${BASE}/sw.js`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("smart-menu-v6");
    // bounded image cache (not the unbounded cacheFirst of early rounds)
    expect(/LRU|maxEntries|MAX_IMAGE/.test(body)).toBe(true);
  });

  // ── round87-B10: re-encoded promo video ───────────────────────────────
  test("promo.mp4 is served as video/mp4 in the re-encoded size range", async ({ request }) => {
    const res = await request.get(`${BASE}/video/promo.mp4`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("video/mp4");
    // round87-B10 re-encoded 1.09MB → ~150KB; the range catches a regression
    // to the original heavy asset while tolerating container metadata drift.
    const len = Number(res.headers()["content-length"] ?? 0);
    expect(len).toBeGreaterThan(100_000);
    expect(len).toBeLessThan(250_000);
  });

  // ── round87-D4: print page exists ─────────────────────────────────────
  test("print page exists and renders menu content", async ({ request }) => {
    const res = await request.get(`${BASE}/menu/al-waha-cafe/print`, {
      headers: { Accept: "text/html" },
    });
    expect(res.status()).toBeLessThan(400);
    expect(res.headers()["content-type"] ?? "").toContain("text/html");
    const html = await res.text();
    expect(html).toContain("د.ل");
  });

  // ── round87-B6: sinceId cursor returns ONLY additions ─────────────────
  // round88 closure: the cursor semantics are verified with the LOCAL admin
  // seed (ci-seed admin/admin123456) — production's admin credentials are
  // owner-held, so the authenticated portion is localhost-only by design
  // (the unauth gate itself is live-verified on production below).
  test("admin system-events sinceId cursor: strictly-newer events only, in id order", async ({ request }) => {
    test.skip(/https?:\/\/menu\.smart-link\.ly/.test(BASE), "sinceId semantics need the local admin seed — production admin creds are owner-held");
    // Route is gated (alive + param accepted even unauthenticated)
    const unauth = await request.get(`${BASE}/api/admin/system-events?sinceId=1`);
    expect([401, 403]).toContain(unauth.status());

    const { session, csrf } = await adminLogin(request);

    // Baseline cursor: event A exists, cursor AT A excludes A (strictly >).
    const idA = await createGuardEvent(request, session, csrf, "a");
    const atA = await getEventsSince(request, session, idA);
    expect(atA.status).toBe(200);
    expect(atA.body.success).toBe(true);
    expect(atA.body.data?.every((e) => e.id > idA)).toBe(true);

    // Add event B → the SAME cursor now returns it (additions only).
    const idB = await createGuardEvent(request, session, csrf, "b");
    expect(idB).toBeGreaterThan(idA); // auto-increment — no concurrent writers here
    const afterB = await getEventsSince(request, session, idA);
    expect(afterB.status).toBe(200);
    const ids = (afterB.body.data ?? []).map((e) => e.id);
    expect(ids).toContain(idB);
    expect(ids).not.toContain(idA); // the cursor boundary itself never leaks back
    // ascending id order (client replays in order)
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);

    // Cursor AT B excludes B too — the boundary is exclusive on every call.
    const atB = await getEventsSince(request, session, idB);
    expect((atB.body.data ?? []).map((e) => e.id)).not.toContain(idB);

    // The cursor is echoed back so the poller can advance its watermark.
    expect(afterB.body.sinceId).toBe(idA);
  });

  // ── round85: baseline security headers ────────────────────────────────
  test("security headers: X-Frame-Options DENY + nosniff + CSP on pages AND API", async ({ request }) => {
    const page = await request.get(`${BASE}/`, { headers: { Accept: "text/html" } });
    expect(page.status()).toBe(200);
    expect(page.headers()["x-frame-options"]).toBe("DENY");
    expect(page.headers()["x-content-type-options"]).toBe("nosniff");
    const pageCsp = page.headers()["content-security-policy"] ?? "";
    expect(pageCsp).toContain("default-src 'self'");

    // API responses get the stricter script policy (no unsafe-inline scripts)
    const api = await request.get(`${BASE}/api/health`);
    expect(api.status()).toBe(200);
    expect(api.headers()["x-frame-options"]).toBe("DENY");
    expect(api.headers()["content-security-policy"] ?? "").toContain("script-src 'self'");
  });
});
