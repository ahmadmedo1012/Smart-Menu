import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'cd /home/ahmed/UTILITIES/smart-menu && npm run dev',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: true,
  },
});
