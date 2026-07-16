import type { Browser, BrowserContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { attachRenderLoopGuardToContext } from './renderLoopGuard';

const SETTINGS_KEY = 'hashtree-cc-settings-v1';
const GB = 1024 * 1024 * 1024;
const relayPort = process.env.TEST_RELAY_PORT ?? '14736';

function buildSettings(relayUrl: string, blossomServers = [
  { url: 'https://blossom.primal.net', read: true, write: true },
]) {
  return {
    network: {
      relays: [relayUrl],
      blossomServers,
    },
    storage: {
      maxBytes: GB,
    },
    ui: {
      showConnectivity: true,
    },
  };
}

async function newContextWithRelay(
  browser: Browser,
  failures: Set<string>,
  relayUrl: string,
  blossomServers = [{ url: 'https://blossom.primal.net', read: true, write: true }]
): Promise<BrowserContext> {
  const context = await browser.newContext();
  attachRenderLoopGuardToContext(context, failures);
  const settings = buildSettings(relayUrl, blossomServers);
  await context.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: SETTINGS_KEY, value: settings });
  return context;
}

async function getPeerCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const state = (window as unknown as { __hashtreeCcP2P?: { peerCount?: number } }).__hashtreeCcP2P;
    return state?.peerCount ?? 0;
  });
}

test('two isolated sessions discover and connect over FIPS WebRTC', async ({ browser, renderLoopFailures }) => {
  const relayNamespace = `p2p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const relayUrl = `ws://localhost:${relayPort}/${relayNamespace}`;

  const contextA = await newContextWithRelay(browser, renderLoopFailures, relayUrl);
  const contextB = await newContextWithRelay(browser, renderLoopFailures, relayUrl);

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await Promise.all([pageA.goto('/'), pageB.goto('/')]);

    await expect.poll(async () => pageA.evaluate(() => {
      const state = (window as unknown as { __hashtreeCcP2P?: { started?: boolean } }).__hashtreeCcP2P;
      return state?.started ?? false;
    }), { timeout: 30_000 }).toBe(true);

    await expect.poll(async () => pageB.evaluate(() => {
      const state = (window as unknown as { __hashtreeCcP2P?: { started?: boolean } }).__hashtreeCcP2P;
      return state?.started ?? false;
    }), { timeout: 30_000 }).toBe(true);

    await expect.poll(async () => Promise.all([
      pageA.evaluate(() => window.__hashtreeCcP2P?.discoveryScope ?? ''),
      pageB.evaluate(() => window.__hashtreeCcP2P?.discoveryScope ?? ''),
    ])).toEqual(['fips-overlay-v1', 'fips-overlay-v1']);

    await expect.poll(async () => {
      const [peerCountA, peerCountB] = await Promise.all([
        getPeerCount(pageA),
        getPeerCount(pageB),
      ]);
      return peerCountA > 0 && peerCountB > 0;
    }, { timeout: 30000 }).toBe(true);

    await expect.poll(async () => pageA.evaluate(() => {
      const icon = document.querySelector<HTMLElement>('[data-testid="connectivity-indicator"] .i-lucide-wifi');
      return icon ? getComputedStyle(icon).color : null;
    }), { timeout: 30000 }).toBe('rgb(88, 166, 255)');

    await pageA.goto('/#/settings');
    await expect(pageA.getByTestId('settings-peer-item').first()).toBeVisible();
    await expect(pageA.getByTestId('settings-relay-item').first()).toContainText('localhost');
    await expect(pageA.getByTestId('settings-relay-status-connected').first()).toBeVisible();
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});

test('keeps its FIPS device identity across reloads', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => page.evaluate(() => (
    window.__hashtreeCcP2P?.pubkey ?? ''
  )), { timeout: 30_000 }).not.toBe('');

  const beforeReload = await page.evaluate(() => window.__hashtreeCcP2P?.pubkey ?? '');
  await page.reload();
  await expect.poll(async () => page.evaluate(() => (
    window.__hashtreeCcP2P?.pubkey ?? ''
  )), { timeout: 30_000 }).toBe(beforeReload);
});

test('viewer fetch uses the explicitly shared FIPS provider when blossom read servers are disabled', async ({ browser, renderLoopFailures }) => {
  test.setTimeout(120_000);
  const relayNamespace = `p2p-provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const relayUrl = `ws://localhost:${relayPort}/${relayNamespace}`;

  const contextA = await newContextWithRelay(browser, renderLoopFailures, relayUrl, []);
  const contextB = await newContextWithRelay(browser, renderLoopFailures, relayUrl, []);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await Promise.all([pageA.goto('/'), pageB.goto('/')]);

    await expect.poll(async () => {
      const [peerCountA, peerCountB] = await Promise.all([
        getPeerCount(pageA),
        getPeerCount(pageB),
      ]);
      return peerCountA > 0 && peerCountB > 0;
    }, { timeout: 60_000 }).toBe(true);

    const content = `p2p-provider-${Date.now()}`;
    await pageA.getByTestId('file-input').setInputFiles({
      name: 'peer-fallback.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(content),
    });
    await expect(pageA.getByTestId('file-viewer')).toBeVisible({ timeout: 10000 });

    const shareUrl = pageA.url();
    const hashPart = shareUrl.includes('#') ? shareUrl.slice(shareUrl.indexOf('#')) : '';
    expect(hashPart.startsWith('#/nhash1')).toBe(true);

    const sourcePeerId = await pageB.evaluate(() => (
      window.__hashtreeCcP2P?.peers.find((peer) => peer.connected)?.peerId ?? ''
    ));
    expect(sourcePeerId).toMatch(/^(02|03)[0-9a-f]{64}$/);

    await pageB.goto(`/${hashPart}`);
    await expect.poll(async () => pageB.evaluate(() => (
      window.__hashtreeCcP2P?.blobRoutes ?? null
    ))).toEqual([]);
    await expect(pageB.locator('body')).not.toContainText(content, { timeout: 2_000 });

    await pageB.goto(`/?provider=${encodeURIComponent(sourcePeerId)}${hashPart}`);
    expect(new URL(pageB.url()).searchParams.get('provider')).toBe(sourcePeerId);
    await expect.poll(async () => pageB.evaluate(() => (
      window.__hashtreeCcP2P?.blobRoutes ?? []
    )), { timeout: 30_000 }).toEqual([{ peerId: sourcePeerId, htl: 10 }]);
    await expect(pageB.getByTestId('file-viewer')).toBeVisible({ timeout: 20000 });
    await expect(pageB.getByTestId('viewer-text')).toContainText(content, { timeout: 20000 });
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
