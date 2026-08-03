import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "test-results/report" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://menu.smart-link.ly",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "webhook",
      testMatch: "tests/e2e/webhook*.ts",
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
        "tests/e2e/persona-1-customer.spec.ts",
        "tests/e2e/persona-3-owner.spec.ts",
        "tests/e2e/persona-4-multimenu.spec.ts",
        "tests/e2e/persona-6-browser.spec.ts",
        "tests/e2e/persona-7-malicious.spec.ts",
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
