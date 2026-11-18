import { defineConfig, devices } from '@playwright/test';

/**
 * E2E testy běží proti spuštěné aplikaci (výchozí: Docker Compose na :8080)
 * s naplněnými demo daty. Jinou adresu lze nastavit proměnnou E2E_BASE_URL,
 * např. `E2E_BASE_URL=http://localhost:5173` pro vývojový server.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
