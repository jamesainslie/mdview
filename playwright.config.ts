import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  use: {
    // Extensions are not reliably supported in Playwright's headless_shell.
    // Use headed mode; in CI run under Xvfb on Linux if needed.
    headless: false,
  },
});

