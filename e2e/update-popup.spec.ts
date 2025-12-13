import * as fs from 'fs';
import * as path from 'path';
import { chromium, expect, test } from 'playwright/test';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getExtensionPath(): string {
  const distPath = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Missing dist directory at ${distPath}. Run "bun run build:test" before executing E2E tests.`
    );
  }
  return distPath;
}

async function waitForExtensionServiceWorker(context: any) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const sws = context.serviceWorkers();
    const sw = sws.find((w: any) => w.url().startsWith('chrome-extension://'));
    if (sw) return sw;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Timed out waiting for extension service worker');
}

function extractExtensionIdFromUrl(url: string): string {
  const match = url.match(/^chrome-extension:\/\/([^/]+)\//);
  if (!match) throw new Error(`Could not extract extension id from url: ${url}`);
  return match[1];
}

test.describe('Popup update UI', () => {
  test('shows up-to-date when no update is available', async () => {
    const extensionPath = getExtensionPath();

    const userDataDir = path.resolve(__dirname, '..', '.playwright-user-data', 'no-update');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    try {
      const sw = await waitForExtensionServiceWorker(context);
      const extensionId = extractExtensionIdFromUrl(sw.url());

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

      await page.evaluate(async () => {
        await chrome.storage.local.set({
          mdview_test_update_scenario: 'no_update',
          mdview_test_reload_called_at: undefined,
        });
      });

      await page.click('#btn-update-check');
      await expect(page.locator('#update-status')).toHaveText('Up to date');
      await expect(page.locator('#btn-update-apply')).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('shows update available and records apply action', async () => {
    const extensionPath = getExtensionPath();

    const userDataDir = path.resolve(__dirname, '..', '.playwright-user-data', 'update-available');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    try {
      const sw = await waitForExtensionServiceWorker(context);
      const extensionId = extractExtensionIdFromUrl(sw.url());

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

      await page.evaluate(async () => {
        await chrome.storage.local.set({
          mdview_test_update_scenario: 'update_available',
          mdview_test_reload_called_at: undefined,
        });
      });

      await page.click('#btn-update-check');
      await expect(page.locator('#update-status')).toHaveText('Update available');
      await expect(page.locator('#btn-update-apply')).toBeVisible();

      await page.click('#btn-update-apply');

      const reloadCalledAt = await page.evaluate(async () => {
        const result = await chrome.storage.local.get('mdview_test_reload_called_at');
        return result.mdview_test_reload_called_at as number | undefined;
      });

      expect(typeof reloadCalledAt).toBe('number');
      expect(reloadCalledAt).toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });
});

