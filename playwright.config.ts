import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  use: {
    baseURL: "http://localhost:3456",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "PORT=3456 npx next dev -p 3456",
    port: 3456,
    timeout: 120000,
    reuseExistingServer: true,
  },
});
