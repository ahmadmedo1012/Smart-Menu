import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["html", { outputFolder: "test-results/report" }], ["list"]],
  use: {
    // Dev default: localhost. Next dev normalizes the middleware request URL
    // to localhost, and the nonce-based CSP stamps scripts only for that
    // normalized host — connecting via 127.0.0.1 leaves inline scripts with
    // nonce="" (CSP strict-dynamic blocks them, client pages never hydrate).
    // Point BASE_URL at http://localhost:3000 for local runs; production
    // (https://menu.smart-link.ly) needs no change.
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "webhook",
      testMatch: "tests/security/webhook-security.test.ts",
    },
    {
      name: "security",
      testMatch: "tests/security/*.test.ts",
    },
    {
      name: "api",
      testMatch: ["tests/e2e/api-smoke.test.ts", "tests/e2e/api-sweep.test.ts", "tests/e2e/full-sweep.test.ts"],
    },
    {
      name: "ui",
      testMatch: ["tests/e2e/ui-smoke.test.ts", "tests/e2e/ui-sweep.test.ts"],
    },
    {
      name: "qa-teams",
      testMatch: [
        "tests/e2e/team1-auth.spec.ts",
        "tests/e2e/team2-customer.spec.ts",
        "tests/e2e/team3-owner.spec.ts",
        "tests/e2e/team4-payments.spec.ts",
        "tests/e2e/team5-admin.spec.ts",
        "tests/e2e/team6-a11y.spec.ts",
        "tests/e2e/team7-security.spec.ts",
        "tests/e2e/round80-security.spec.ts",
        "tests/e2e/round80-geometry.spec.ts",
        "tests/e2e/persona-1-customer.spec.ts",
        "tests/e2e/persona-3-owner.spec.ts",
        "tests/e2e/persona-4-multimenu.spec.ts",
        "tests/e2e/persona-6-browser.spec.ts",
        "tests/e2e/persona-7-malicious.spec.ts",
        "tests/e2e/round4-deep.spec.ts",
        "tests/e2e/round5-lifecycle.spec.ts",
        "tests/e2e/round6-subscriptions.spec.ts",
        "tests/e2e/round8-whatsapp.spec.ts",
        "tests/e2e/round29-cart-regression.spec.ts",
      ],
    },
    {
      // Cross-browser smoke: same UI suite on firefox + webkit (production).
      // Run explicitly: npx playwright test tests/e2e/ui-smoke.test.ts --project=qa-cross-browser
      name: "qa-cross-browser",
      testMatch: ["tests/e2e/ui-smoke.test.ts", "tests/e2e/team2-customer.spec.ts", "tests/e2e/persona-6-browser.spec.ts"],
      use: {
        browserName: "firefox",
      },
    },
    {
      name: "qa-cross-browser-webkit",
      testMatch: ["tests/e2e/ui-smoke.test.ts", "tests/e2e/persona-6-browser.spec.ts"],
      use: {
        browserName: "webkit",
      },
    },
    {
      name: "auth-verify",
      testMatch: "tests/e2e/auth-fix-verification.spec.ts",
      use: { baseURL: "http://localhost:3000" },
    },
  ],
});
