import { defineConfig, devices } from '@playwright/test';

// E2E_PORT permite rodar os testes com outro app ocupando a porta 3000
const PORT = Number(process.env.E2E_PORT || 3000);

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
    baseURL: `http://localhost:${PORT}`,
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
    port: PORT,
    env: { PORT: String(PORT) },
    reuseExistingServer: true,
    timeout: 30000,
  },
});
