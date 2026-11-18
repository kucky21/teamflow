import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['test/support/global-setup.ts'],
          setupFiles: ['test/support/setup-env.ts'],
          // Testy sdílí jednu testovací databázi – soubory běží sekvenčně.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
