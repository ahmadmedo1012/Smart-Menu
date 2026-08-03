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
      ],
    },
    {
      name: "auth-verify",
      testMatch: "tests/e2e/auth-fix-verification.spec.ts",
      use: { baseURL: "http://localhost:3000" },
    },
  ],
});
