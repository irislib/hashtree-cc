import type { Browser, BrowserContext, Page } from '@playwright/test';
import { test as base, expect } from './fixtures';
import { startLocalFipsWebSocketSeed, type LocalFipsWebSocketSeed } from './localFipsWebSocketSeed';
import { attachRenderLoopGuardToContext } from './renderLoopGuard';

const SETTINGS_KEY = 'hashtree-cc-settings-v1';
const GB = 1024 * 1024 * 1024;
const relayPort = process.env.TEST_RELAY_PORT ?? '14736';

// Match only the production provider's two default seed destinations.
// Nostr, arbitrary WebSockets, workers and all network-denial controls are unchanged.
const PUBLIC_FIPS_SEEDS = ['wss://fips1.iris.to/fips', 'wss://fips2.iris.to/fips'];
const test = base.extend<{ localFipsSeeds: LocalFipsWebSocketSeed[] }>({
  localFipsSeeds: async ({}, use) => {
    const seeds: LocalFipsWebSocketSeed[] = [];
    try {
      for (const _ of PUBLIC_FIPS_SEEDS) seeds.push(await startLocalFipsWebSocketSeed());
      await use(seeds);
    } finally {
      await Promise.all(seeds.map(seed => seed.close()));
    }
  },
});

async function useLocalFipsSeeds(context: BrowserContext, seeds: LocalFipsWebSocketSeed[]): Promise<void> {
  expect(seeds).toHaveLength(PUBLIC_FIPS_SEEDS.length);
  await context.addInitScript(({ publicUrls, localUrls }) => {
    const destinations = new Map(publicUrls.map((url, index) => [url, localUrls[index]]));
    const NativeWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(destinations.get(new URL(url).href) ?? url, protocols);
      }
    };
  }, { publicUrls: PUBLIC_FIPS_SEEDS, localUrls: seeds.map(seed => seed.url) });
}

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
  localFipsSeeds: LocalFipsWebSocketSeed[],
  blossomServers = [{ url: 'https://blossom.primal.net', read: true, write: true }]
): Promise<BrowserContext> {
  const context = await browser.newContext();
  await useLocalFipsSeeds(context, localFipsSeeds);
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

test('two isolated sessions discover and connect over FIPS WebRTC', async ({ browser, renderLoopFailures, localFipsSeeds }) => {
  const relayNamespace = `p2p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const relayUrl = `ws://localhost:${relayPort}/${relayNamespace}`;

  const contextA = await newContextWithRelay(browser, renderLoopFailures, relayUrl, localFipsSeeds);
  const contextB = await newContextWithRelay(browser, renderLoopFailures, relayUrl, localFipsSeeds);

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

test('keeps its FIPS device identity across reloads', async ({ page, localFipsSeeds }) => {
  await useLocalFipsSeeds(page.context(), localFipsSeeds);
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


async function expectExplicitPeerPair(first: Page, second: Page, firstId: string, secondId: string) {
  expect(firstId).not.toBe(secondId);
  const state = (page: Page, otherId: string) => page.evaluate(other => {
    const current = window.__hashtreeCcP2P;
    return { id: current?.peerId ?? '', connected: current?.peers.some(peer => peer.peerId === other && peer.connected) ?? false };
  }, otherId);
  await Promise.all([
    expect.poll(() => state(first, secondId), { timeout: 60_000 }).toEqual({ id: firstId, connected: true }),
    expect.poll(() => state(second, firstId), { timeout: 60_000 }).toEqual({ id: secondId, connected: true }),
  ]);
}

async function expectFreshExplicitPeerBlock(sender: Page, receiver: Page) {
  const block = await sender.evaluate(async () => {
    const path = '/src/lib/workerClient.ts';
    const client = await (await import(path)).getWorkerClient();
    const text = `reloaded-explicit-peer-${crypto.randomUUID()}`;
    const stored = await client.putBlock(new TextEncoder().encode(text), { upload: false });
    return { hash: stored.hashHex, text };
  });
  expect(await receiver.evaluate(async hash => {
    const path = '/src/lib/workerClient.ts';
    const client = await (await import(path)).getWorkerClient();
    return (await client.hasBlob(hash, { sourceIds: ['idb'] })).available;
  }, block.hash)).toBe(false);
  expect(await receiver.evaluate(async hash => {
    const path = '/src/lib/workerClient.ts';
    const client = await (await import(path)).getWorkerClient();
    const received = await client.getBlob(hash);
    return { text: new TextDecoder().decode(received.data), source: received.source };
  }, block.hash)).toEqual({ text: block.text, source: 'p2p' });
}

test('explicit FIPS provider fetch survives reload and its cached viewer serves a third device', async ({ browser, renderLoopFailures, localFipsSeeds }) => {
  // Keep all old phase limits and budget two added 60-second recoveries.
  test.setTimeout(280_000);
  const relayNamespace = `p2p-provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const relayUrl = `ws://localhost:${relayPort}/${relayNamespace}`;

  const contextA = await newContextWithRelay(browser, renderLoopFailures, relayUrl, localFipsSeeds, []);
  const contextB = await newContextWithRelay(browser, renderLoopFailures, relayUrl, localFipsSeeds, []);
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

    const sourcePeerId = await pageA.evaluate(() => window.__hashtreeCcP2P?.peerId ?? '');
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

    const cachedProvider = await pageB.evaluate(() => window.__hashtreeCcP2P?.peerId ?? '');
    expect(cachedProvider).toMatch(/^(02|03)[0-9a-f]{64}$/);
    await pageB.reload();
    await expect(pageB.getByTestId('viewer-text')).toContainText(content, { timeout: 20000 });
    await expect.poll(() => pageB.evaluate(() => window.__hashtreeCcP2P?.peerId ?? ''))
      .toBe(cachedProvider);
    // A receiver must explicitly name its provider. Set the real share URL
    // before reload; the application's default empty provider routes stay intact.
    await pageA.evaluate(peerId => {
      const url = new URL(location.href);
      url.searchParams.set('provider', peerId);
      history.replaceState(null, '', url);
    }, cachedProvider);
    await pageA.reload();
    await expectExplicitPeerPair(pageA, pageB, sourcePeerId, cachedProvider);
    await expect.poll(() => pageA.evaluate(() => window.__hashtreeCcP2P?.blobRoutes ?? []))
      .toEqual([{ peerId: cachedProvider, htl: 10 }]);
    await expectFreshExplicitPeerBlock(pageA, pageB);
    console.log('BROWSER_PEER_RELOAD', JSON.stringify({ app: 'hashtree-cc', endpoint: 'first',
      identityStable: true, bothPeersConnected: true, freshTransfer: true, source: 'p2p' }));
    await pageB.reload();
    await expectExplicitPeerPair(pageA, pageB, sourcePeerId, cachedProvider);
    await expectFreshExplicitPeerBlock(pageB, pageA);
    console.log('BROWSER_PEER_RELOAD', JSON.stringify({ app: 'hashtree-cc', endpoint: 'second',
      identityStable: true, bothPeersConnected: true, freshTransfer: true, source: 'p2p' }));
    await contextA.close();

    const contextC = await newContextWithRelay(browser, renderLoopFailures, relayUrl, localFipsSeeds, []);
    try {
      const pageC = await contextC.newPage();
      await pageC.goto(`/?provider=${encodeURIComponent(cachedProvider)}${hashPart}`);
      await expect(pageC.getByTestId('viewer-text')).toContainText(content, { timeout: 30000 });
    } finally {
      await contextC.close();
    }
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
