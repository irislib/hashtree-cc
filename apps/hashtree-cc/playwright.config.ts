import { defineConfig } from '@playwright/test';

const relayPort = process.env.TEST_RELAY_PORT ?? '14736';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5177',
  },
  webServer: [
    {
      command: `RELAY_PORT=${relayPort} node ./e2e/relay/index.js`,
      url: `http://localhost:${relayPort}`,
      reuseExistingServer: false,
      timeout: 5000,
    },
    {
      command: 'VITE_TEST_MODE=1 pnpm run dev --port 5177 --strictPort',
      url: 'http://localhost:5177',
      reuseExistingServer: false,
    },
  ],
});
