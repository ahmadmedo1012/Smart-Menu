import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/regression",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "https://smart-menu-sigma.vercel.app",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
