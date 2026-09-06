/**
 * Team 9 — Performance smoke: latency budgets for the public endpoints on
 * the LOCAL server (localhost standalone build + embedded/CI Postgres).
 *
 * Measured with Playwright's `request` fixture (end-to-end client-observed
 * latency: HTTP stack + middleware + route + DB round-trips).
 *
 * Threshold rationale (deliberately tolerant for a box environment):
 *   - /api/health  < 500ms  — one `SELECT 1` via the pool. The budget is ~10x
 *     the observed ~20-60ms; anything above means connection storms, pool
 *     exhaustion, or a broken health probe (these run on 2-vCPU CI runners
 *     too, where JIT + shared CPU add noise).
 *   - public menu page < 2000ms — full SSR of /menu/[slug] (categories +
 *     items + featured query + generateMetadata). Warm-cache render is
 *     ~100-400ms locally; 2000ms still catches missing-index table scans
 *     and N+1 regressions while absorbing first-render compilation.
 *   - /api/stats (auth-gated) < 1500ms — the real authenticated stats
 *     aggregation (requireAuth + counts + groupBy), not just the 401 path.
 *     1500ms catches the pre-round87 sequential-waterfall shape while
 *     tolerating CI-runner CPU contention.
 *
 * Method: one warmup request (route compilation + pool warm-up, NOT
 * measured), then 3 measured requests; the MEDIAN must be under budget.
 * Median-of-3 (not max, not mean) absorbs one-off GC/scheduler spikes —
 * a consistently slow endpoint still fails, a single hiccup does not.
 *
 * No test.fail / no retries — plain measurements with reasonable budgets.
 * Run: npx playwright test tests/e2e/team9-perf-smoke.spec.ts --project=qa-teams
 * (requires a server on BASE_URL, default http://localhost:3000, with the
 * round83 seed for the al-waha-cafe menu page.)
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const RUNTIME_HOST = "localhost";
const raw = process.env.BASE_URL || `http://${RUNTIME_HOST}:3000`;
const u = new URL(raw.replace(/\/+$/, ""));
if (u.hostname === "127.0.0.1") u.hostname = RUNTIME_HOST;
const BASE = u.origin;

const MENU_PATH = "/menu/al-waha-cafe";
const HEALTH_BUDGET_MS = 500;
const MENU_PAGE_BUDGET_MS = 2000;
const STATS_BUDGET_MS = 1500;

const WARMUP = 1;
const SAMPLES = 3;

/** Median of the measured samples (warmup excluded). */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Time a GET (client-observed). Warmups run first and are not measured. */
async function measureGet(
  request: APIRequestContext,
  path: string,
  options: { expectStatus: number; headers?: Record<string, string>; assertBody?: (json: unknown) => void }
): Promise<{ medianMs: number; samples: number[]; lastStatus: number }> {
  const samples: number[] = [];
  let lastStatus = 0;
  for (let i = 0; i < WARMUP + SAMPLES; i++) {
    const started = performance.now();
    const res = await request.get(`${BASE}${path}`, { headers: options.headers });
    const ms = performance.now() - started;
    lastStatus = res.status();
    // Correctness first — a fast wrong answer is still a failure.
    expect(lastStatus).toBe(options.expectStatus);
    if (options.assertBody && i === WARMUP) {
      options.assertBody(await res.json().catch(() => ({})));
    }
    if (i >= WARMUP) samples.push(ms);
  }
  return { medianMs: median(samples), samples, lastStatus };
}

/** Login via the API and return the headers carrying the session cookie. */
async function sessionHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const csrf = await mintCsrfPair(request);
  const res = await request.post(`${BASE}/api/auth/login`, {
    headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, csrf) },
    data: {
      username: "waha_owner",
      password: process.env.WAHA_OWNER_PASS || "waha123456",
    },
  });
  expect(res.status()).toBe(200);
  // The request fixture's jar does not reliably persist Set-Cookie — carry it
  // explicitly (same workaround as csrf-helper).
  const setCookie = res.headers()["set-cookie"] ?? "";
  const session = setCookie.match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
  expect(session).not.toBe("");
  return { Cookie: `smart-menu-session=${session}` };
}

test.describe("team9: perf smoke — public endpoint latency budgets (localhost)", () => {
  test(`/api/health answers in < ${HEALTH_BUDGET_MS}ms (median of ${SAMPLES})`, async ({ request }) => {
    const { medianMs, samples } = await measureGet(request, "/api/health", {
      expectStatus: 200,
      assertBody: (json) => {
        const body = json as { status?: string; db?: string };
        expect(body.status).toBe("ok");
        expect(body.db).toBe("connected");
      },
    });
    test.info().annotations.push({ type: "perf", description: `health median=${medianMs.toFixed(0)}ms samples=${samples.map((s) => s.toFixed(0)).join(",")}` });
    expect(medianMs).toBeLessThan(HEALTH_BUDGET_MS);
  });

  test(`public menu page (${MENU_PATH}) renders in < ${MENU_PAGE_BUDGET_MS}ms (median of ${SAMPLES})`, async ({ request }) => {
    const samples: number[] = [];
    for (let i = 0; i < WARMUP + SAMPLES; i++) {
      const started = performance.now();
      const res = await request.get(`${BASE}${MENU_PATH}`, { headers: { Accept: "text/html" } });
      const ms = performance.now() - started;
      expect(res.status()).toBe(200);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct).toContain("text/html");
      if (i === WARMUP) {
        // It must be the real menu, not an error shell (a fast 404/500 page
        // would otherwise game the budget).
        const html = await res.text();
        expect(html).toContain("al-waha");
      }
      if (i >= WARMUP) samples.push(ms);
    }
    const medianMs = median(samples);
    test.info().annotations.push({ type: "perf", description: `menu page median=${medianMs.toFixed(0)}ms samples=${samples.map((s) => s.toFixed(0)).join(",")}` });
    expect(medianMs).toBeLessThan(MENU_PAGE_BUDGET_MS);
  });

  test(`/api/stats (authenticated) answers in < ${STATS_BUDGET_MS}ms (median of ${SAMPLES})`, async ({ request }) => {
    const auth = await sessionHeaders(request);
    const { medianMs, samples } = await measureGet(request, "/api/stats", {
      expectStatus: 200,
      headers: auth,
      assertBody: (json) => {
        const body = json as { success?: boolean; data?: unknown };
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      },
    });
    test.info().annotations.push({ type: "perf", description: `stats median=${medianMs.toFixed(0)}ms samples=${samples.map((s) => s.toFixed(0)).join(",")}` });
    expect(medianMs).toBeLessThan(STATS_BUDGET_MS);
  });

  test("/api/stats stays fast even on the unauthenticated rejection path", async ({ request }) => {
    // The 401 path exercises middleware + requireAuth rejection only — it
    // must be an order of magnitude faster than the authenticated budget.
    const { medianMs } = await measureGet(request, "/api/stats", { expectStatus: 401 });
    expect(medianMs).toBeLessThan(STATS_BUDGET_MS);
  });
});
