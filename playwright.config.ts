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
      name: "ui",
      testMatch: "tests/e2e/*.test.ts",
    },
  ],
});
