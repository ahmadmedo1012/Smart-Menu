import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev",
      port: 3001,
      reuseExistingServer: true,
    },
  ],
});
