import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1, // Execução sequencial para evitar concorrência de banco no E2E
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'node dist-server/server/server.js',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
