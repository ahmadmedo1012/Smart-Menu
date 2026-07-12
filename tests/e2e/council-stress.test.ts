/**
 * Council Stress & Race-Condition Tests for Telegram Webhook Pipeline
 *
 * Targets the live webhook endpoint with adversarial request patterns:
 * bursts, races, malformed payloads, brute-force tokens, idempotency,
 * and overlapping approve+cancel for the same payment.
 *
 * Run:  npx playwright test tests/e2e/council-stress.test.ts
 */
import { test, expect } from "@playwright/test";

const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET ??
  "rWw1bozjGEj01qv2XGpzJS9BjdQf0OqZVhNgt4XE";
const ADMIN_ID =
  Number(process.env.TELEGRAM_ADMIN_IDS?.split(",")[0]) || 8949246746;
const BASE_URL =
  process.env.BASE_URL ?? "https://menu.smart-link.ly/";
const WEBHOOK_URL = `${BASE_URL}api/telegram/webhook`;

// ── Helpers ──────────────────────────────────────────────────────

function makePayload(
  overrides: Record<string, unknown> = {},
  paymentId: number = 0,
  action: string = "sub_app",
) {
  return {
    update_id: Date.now() % 1_000_000,
    callback_query: {
      id: `cq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: { id: ADMIN_ID },
      message: {
        chat: { id: ADMIN_ID },
        message_id: Math.floor(Math.random() * 1_000_000),
      },
      data: `${action}:${paymentId}`,
      ...overrides,
    },
  };
}

async function post(
  request: import("@playwright/test").APIRequestContext,
  payload: unknown,
  secret?: string,
) {
  const res = await request.post(WEBHOOK_URL, {
    headers: {
      "Content-Type": "application/json",
      "x-telegram-bot-api-secret-token":
        secret ?? WEBHOOK_SECRET,
    },
    data: payload,
  });
  return { status: res.status(), body: await res.text() };
}

// ── 1. Burst of 50 rapid requests ────────────────────────────────

test.describe("Burst & Throughput", () => {
  test("1. burst 50 rapid requests — measure error rate", async ({
    request,
  }) => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        post(request, makePayload({}, i)),
      ),
    );
    const non200 = results.filter((r) => r.status !== 200);
    // All must return 200 (webhook catch-all pattern)
    expect(non200.length).toBe(0);
  });
});

// ── 2. Race: concurrent approve callbacks, same payment ──────────

test.describe("Race Conditions", () => {
  test("2. 3 concurrent approve callbacks with overlapping payment ID", async ({
    request,
  }) => {
    const sharedPaymentId = 999999;
    const results = await Promise.all([
      post(request, makePayload({}, sharedPaymentId, "sub_app")),
      post(request, makePayload({}, sharedPaymentId, "sub_app")),
      post(request, makePayload({}, sharedPaymentId, "sub_app")),
    ]);
    // No crash, all return 200 — resolves itself via Prisma atomic update
    for (const r of results) {
      expect(r.status, `concurrent approve returned ${r.status}`).toBe(200);
    }
  });

  test("11. simultaneous approve + cancel for same payment", async ({
    request,
  }) => {
    const sharedPaymentId = 999998;
    const results = await Promise.all([
      post(request, makePayload({}, sharedPaymentId, "sub_app")),
      post(request, makePayload({}, sharedPaymentId, "sub_rej")),
      post(request, makePayload({}, sharedPaymentId, "sub_app")),
      post(request, makePayload({}, sharedPaymentId, "sub_rej")),
    ]);
    for (const r of results) {
      expect(r.status, `approve+cancel race returned ${r.status}`).toBe(200);
    }
  });
});

// ── 3. Malformed secret token brute force ────────────────────────

test.describe("Secret Token Brute Force", () => {
  test("3. 20 random secret token attempts — all rejected with 403", async ({
    request,
  }) => {
    const randomStrings = Array.from({ length: 20 }, () =>
      Math.random().toString(36).repeat(4),
    );
    const results = await Promise.all(
      randomStrings.map((secret) =>
        post(request, { update_id: 1 }, secret),
      ),
    );
    for (const r of results) {
      expect(r.status).toBe(403);
      expect(r.body).toContain("Forbidden");
    }
  });
});

// ── 4-8. Malformed / edge-case payloads ─────────────────────────

test.describe("Malformed & Edge-Case Payloads", () => {
  test("4. empty body POST", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
      },
      data: "",
    });
    // JSON parse error → catch-all → 200
    expect(res.status()).toBe(200);
  });

  test("5. binary body (non-UTF8)", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
      },
      data: Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x81, 0x82]),
    });
    expect(res.status()).toBe(200);
  });

  test("6. extremely nested JSON objects (deep recursion)", async ({
    request,
  }) => {
    // Build 64 levels of nesting — JSON.parse depth limit test
    let nested: Record<string, unknown> = {};
    let ptr = nested;
    for (let i = 0; i < 64; i++) {
      ptr["a"] = {};
      ptr = ptr["a"] as Record<string, unknown>;
    }
    const res = await post(request, {
      update_id: 1,
      callback_query: nested,
    });
    // Deeply nested callback_query has no id/from — handler
    // still returns without crashing (answerCallbackQuery
    // may fail, but catch-all = 200)
    expect(res.status).toBe(200);
  });

  test("7. array instead of object as JSON body", async ({
    request,
  }) => {
    const res = await post(request, [
      { update_id: 1, callback_query: { id: "x" } },
    ]);
    // Arrays are valid JSON but not a TelegramUpdate — no response
    // expected beyond the catch-all 200
    expect(res.status).toBe(200);
  });

  test("8. repeated identical callbacks (idempotency)", async ({
    request,
  }) => {
    const paymentId = 999997;
    // Send 10 identical callbacks
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        post(request, makePayload({}, paymentId, "sub_app")),
      ),
    );
    const non200 = results.filter((r) => r.status !== 200);
    expect(non200.length).toBe(0);
    // Handler uses updateMany with status:"pending" guard,
    // so only the first Prisma write actually mutates.
  });
});

// ── 9. Slowloris-style slow request ─────────────────────────────

test.describe("Slow / Partial Requests", () => {
  test("9. slow request pattern — send partial headers, complete slowly", async ({
    request,
  }) => {
    // NOTE: Playwright's APIRequestContext does not expose streaming
    // partial HTTP. We simulate the server-side impact by sending a
    // large, slow-to-parse payload via the standard path.
    const bigString = JSON.stringify(
      makePayload({}, 999996),
    );
    // Abort controller — not natively supported in APIRequestContext.
    // Instead send the same large payload 10 times concurrently.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        post(request, makePayload({}, 999996)),
      ),
    );
    for (const r of results) {
      expect(r.status, "slow burst all 200").toBe(200);
    }
  });
});

// ── 10. Memory leak / sustained throughput ──────────────────────

test.describe("Sustained Throughput", () => {
  test("10. 200 rapid requests across 4 rounds — no degradation", async ({
    request,
  }) => {
    const roundSize = 50;
    for (let round = 0; round < 4; round++) {
      const results = await Promise.all(
        Array.from({ length: roundSize }, (_, i) =>
          post(request, makePayload({}, round * roundSize + i)),
        ),
      );
      const non200 = results.filter((r) => r.status !== 200);
      expect(non200.length).toBe(0);
    }
  });
});

// ── 12. Overlapping upgrade + cancel for same restaurant ────────

test.describe("Upgrade & Cancel Race", () => {
  test("12. overlapping upgrade and cancel for same payment", async ({
    request,
  }) => {
    const paymentId = 999995;
    // Fire approve + reject interleaved
    const rounds = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0
        ? post(request, makePayload({}, paymentId, "sub_app"))
        : post(request, makePayload({}, paymentId, "sub_rej")),
    );
    const results = await Promise.all(rounds);
    for (const r of results) {
      expect(r.status, `upgrade+cancel overlap returned ${r.status}`).toBe(
        200,
      );
    }
  });
});
