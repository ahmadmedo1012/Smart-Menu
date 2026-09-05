/**
 * Round 86 — negative security specs for the A-phase fixes.
 * Covers: A1 (USER → POST /api/categories), A2 (USER → /api/loyalty/stats with
 * forged smart-menu-restaurant cookie), A4 (cross-tenant order items),
 * A6 (javascript: receipt URL).
 *
 * The account is a fresh self-registered USER (register assigns role USER and
 * auto-creates a session). The session cookie is captured from the register
 * response — page.request's jar does not reliably persist Set-Cookie, so all
 * follow-up calls carry explicit Cookie headers (round85 lesson).
 */
import { test, expect } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const BASE = process.env.BASE_URL || "http://localhost:3000";

interface UserSession {
  token: string;
  cookie: string;
}

/** Register a unique USER account and return its session headers. */
async function registerUser(request: import("@playwright/test").APIRequestContext): Promise<UserSession> {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const csrf = await mintCsrfPair(request);
  const res = await request.post("/api/auth/register", {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersFor(BASE, csrf),
    },
    data: JSON.stringify({
      username: `sec86u${suffix}`,
      password: "SecPass123",
      name: "Sec86 Probe",
    }),
  });
  // 201 created / 429 rate-limited are the only expected outcomes
  if (res.status() === 429) test.skip(true, "register rate-limited on this IP");
  expect(res.status()).toBe(201);

  const setCookie = res.headers()["set-cookie"] ?? "";
  const session = setCookie.match(/smart-menu-session=([^;]+)/)?.[1] ?? "";
  expect(session, "register must set a session cookie").toBeTruthy();
  return { token: session, cookie: `smart-menu-session=${session}` };
}

/** CSRF headers merged with an existing session cookie. */
function sessionHeaders(session: UserSession, csrf: { token: string; cookie: string }) {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrf.token,
    Cookie: `${csrf.cookie}; ${session.cookie}`,
    Origin: BASE,
  };
}

test("A1: USER cannot create a category in any restaurant", async ({ request }) => {
  const session = await registerUser(request);
  const csrf = await mintCsrfPair(request);
  const res = await request.post("/api/categories", {
    headers: sessionHeaders(session, csrf),
    data: JSON.stringify({ restaurantId: 1, name: "sec86-probe" }),
  });
  // USER holds no MANAGE_RESTAURANTS permission — 403, never 201
  expect(res.status()).toBe(403);
});

test("A2: USER cannot read loyalty stats even with a forged restaurant cookie", async ({ request }) => {
  const session = await registerUser(request);
  const res = await request.get("/api/loyalty/stats", {
    headers: {
      Accept: "application/json",
      // forged fallback cookie — the old resolution trusted it verbatim
      Cookie: `${session.cookie}; smart-menu-restaurant=1`,
    },
  });
  expect(res.status()).toBe(403);
});

test("A2b: USER loyalty stats without any cookie is 403 too", async ({ request }) => {
  const session = await registerUser(request);
  const res = await request.get("/api/loyalty/stats", {
    headers: { Accept: "application/json", Cookie: session.cookie },
  });
  expect(res.status()).toBe(403);
});

test("A4: order with items from another tenant is rejected", async ({ request }) => {
  const csrf = await mintCsrfPair(request);
  // Item 1 belongs to restaurant 1 (seeded) — claim it for a nonexistent
  // restaurant 999: the scoped lookup must NOT find the item
  const res = await request.post("/api/orders", {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersFor(BASE, csrf),
    },
    data: JSON.stringify({
      restaurantId: 999,
      customerName: "sec86",
      subtotal: 10,
      total: 10,
      items: [{ itemId: 1, quantity: 1, price: 10 }],
    }),
  });
  // The scoped where-clause finds nothing for tenant 999 → item-not-found 400
  // (before round86 the unscoped lookup FOUND item 1 and the order proceeded)
  expect([400, 404]).toContain(res.status());
});

test("A6: javascript: receipt URL is rejected", async ({ request }) => {
  const session = await registerUser(request);
  const csrf = await mintCsrfPair(request);
  const res = await request.post("/api/subscriptions", {
    headers: sessionHeaders(session, csrf),
    data: JSON.stringify({
      planId: 1,
      amount: 1,
      provider: "bank",
      senderAccountName: "sec86",
      senderAccountNumber: "123456",
      receiptImageUrl: "javascript:alert(1)",
    }),
  });
  // The https-only refine (or any 4xx rejection) — the payment must NEVER be
  // created with a javascript: URL. 429 (rate limit) is also a safe rejection.
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);
});
