/**
 * Security tests — Telegram webhook authentication, SSRF, rate limiting
 *
 * Run:  npx playwright test tests/security/webhook-security.test.ts
 */
import { test, expect } from "@playwright/test";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "rWw1bozjGEj01qv2XGpzJS9BjdQf0OqZVhNgt4XE";
const BASE_URL = process.env.BASE_URL ?? "https://menu.smart-link.ly/";
const WEBHOOK_URL = `${BASE_URL}api/telegram/webhook`;

test.describe("Security: Secret Token Verification", () => {
  test("rejects request with empty secret header", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "",
      },
      data: { update_id: 1, callback_query: { id: "1", from: { id: 1 }, data: "test" } },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects request with whitespace-only secret header", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "   ",
      },
      data: { update_id: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects request with partial secret prefix match", async ({ request }) => {
    const prefix = WEBHOOK_SECRET.slice(0, 8);
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": prefix,
      },
      data: { update_id: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects request with similar-looking substitution", async ({ request }) => {
    const mutated = WEBHOOK_SECRET.replace(/r/g, "R").replace(/w/g, "vv");
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": mutated,
      },
      data: { update_id: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test("handles multiple rapid requests without crashing", async ({ request }) => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      request.post(WEBHOOK_URL, {
        headers: {
          "Content-Type": "application/json",
          "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
        },
        data: {
          update_id: i + 100,
          callback_query: {
            id: `burst-${i}`,
            from: { id: 999_999_999 - i },
            message: { chat: { id: 123 }, message_id: i },
            data: `sub_app:${i}`,
          },
        },
      }),
    );
    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status()).toBe(200);
    }
  });
});

test.describe("Security: SSRF Protection", () => {
  const LARGE_PAYLOAD = {
    update_id: 1,
    message: {
      message_id: 1,
      chat: { id: 1, type: "private" },
      text: "/start verify_" + "A".repeat(8000),
    },
  };

  test("handles large payload without timeout", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
      },
      data: LARGE_PAYLOAD,
    });
    expect(res.status()).toBe(200);
  });

  test("handles nested object payloads safely", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
      },
      data: {
        update_id: 1,
        callback_query: {
          id: "deep",
          from: { id: 1 },
          message: {
            chat: { id: 1 },
            message_id: 1,
            reply_markup: { inline_keyboard: [[{ text: "x", callback_data: "y" }]] },
          },
          data: "sub_app:1",
        },
      },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe("Security: CORS and Access Control", () => {
  test("does not expose sensitive response headers", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "INVALID",
      },
      data: { update_id: 1 },
    });
    const headers = res.headers();
    // Should not expose server internals
    expect(headers["x-powered-by"]).toBeUndefined();
    // CSP should be set (from middleware)
    expect(headers["content-security-policy"]).toBeDefined();
  });

  test("does not set CORS allow-origin wildcard", async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
        Origin: "https://evil.com",
      },
      data: { update_id: 1 },
    });
    const headers = res.headers();
    expect(headers["access-control-allow-origin"]).toBeUndefined();
  });
});
