import { toHex, type Store } from '@hashtree/core';
import { DEFAULT_RELAYS as DEFAULT_NOSTR_RELAYS } from '@hashtree/nostr';
import { DEFAULT_FIPS_DISCOVERY_APP } from '@hashtree/fips-transport';
import {
  createBrowserHashtreeFipsProvider,
  type BrowserHashtreeFipsProvider,
} from '@hashtree/fips-transport/browser';
import { IndexedDbIdentityStore } from '@fips/browser';
import {
  npubFromHex,
  type FipsIdentity,
  type PeerEvent,
  type SessionEvent,
} from '@fips/core';
import { writable } from 'svelte/store';
import {
  blossomBandwidthStore,
  getBlobForPeer,
  putBlob,
  setP2PProvider,
} from './workerClient';
import { settingsStore } from './settings';
import { getEffectiveRelayUrls } from './irisRuntimeNetwork';

const STATS_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 8_000;
const PROVIDER_CONNECT_TIMEOUT_MS = 30_000;
const REMOTE_BLOB_HTL = 10;
export const SHARE_PROVIDER_QUERY = 'provider';

const DEFAULT_RELAYS = DEFAULT_NOSTR_RELAYS.filter((relay) =>
  relay === 'wss://relay.primal.net'
  || relay === 'wss://relay.snort.social'
  || relay === 'wss://temp.iris.to'
);

export type P2PRelayStatus = 'connected' | 'connecting' | 'disconnected';

export interface P2PRelayState {
  url: string;
  status: P2PRelayStatus;
}

export interface P2PPeerState {
  peerId: string;
  pubkey: string;
  connected: boolean;
  pool: 'other';
  bytesSent: number;
  bytesReceived: number;
  requestsSent: number;
  requestsReceived: number;
  responsesSent: number;
  responsesReceived: number;
  forwardedRequests: number;
  forwardedResolved: number;
  forwardedSuppressed: number;
  sessionsEstablished: number;
  lastStateAt: number;
}

export interface BlossomBandwidthServerState {
  url: string;
  bytesSent: number;
  bytesReceived: number;
}

export interface BlossomBandwidthState {
  totalBytesSent: number;
  totalBytesReceived: number;
  updatedAt: number;
  servers: BlossomBandwidthServerState[];
}

export interface P2PState {
  started: boolean;
  peerCount: number;
  relayCount: number;
  connectedRelayCount: number;
  pubkey: string | null;
  npub: string | null;
  peerId: string | null;
  discoveryScope: string;
  blobRoutes: Array<{ peerId: string; htl: number }>;
  peers: P2PPeerState[];
  relays: P2PRelayState[];
  blossomBandwidth: BlossomBandwidthState;
}

const DEFAULT_BLOSSOM_BANDWIDTH: BlossomBandwidthState = {
  totalBytesSent: 0,
  totalBytesReceived: 0,
  updatedAt: 0,
  servers: [],
};

const DEFAULT_STATE: P2PState = {
  started: false,
  peerCount: 0,
  relayCount: 0,
  connectedRelayCount: 0,
  pubkey: null,
  npub: null,
  peerId: null,
  discoveryScope: DEFAULT_FIPS_DISCOVERY_APP,
  blobRoutes: [],
  peers: [],
  relays: [],
  blossomBandwidth: DEFAULT_BLOSSOM_BANDWIDTH,
};

export const p2pStore = writable<P2PState>(DEFAULT_STATE);

let provider: BrowserHashtreeFipsProvider | null = null;
let identity: FipsIdentity | null = null;
let identityPromise: Promise<FipsIdentity> | null = null;
let currentRelays: string[] = DEFAULT_RELAYS;
let activeRelaysKey = '';
let desiredRelaysKey = '';
let syncVersion = 0;
let syncTail: Promise<void> = Promise.resolve();
let initPromise: Promise<void> | null = null;
let settingsUnsubscribe: (() => void) | null = null;
let blossomBandwidthUnsubscribe: (() => void) | null = null;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let currentBlossomBandwidth: BlossomBandwidthState = DEFAULT_BLOSSOM_BANDWIDTH;
let activeBlobRoutes: Array<{ peerId: string; htl: number }> = [];
const peerStats = new Map<string, P2PPeerState>();
let providerUnsubscribes: Array<() => void> = [];

declare global {
  interface Window {
    __hashtreeCcP2P?: P2PState;
  }
}

function normalizeRelay(relay: string): string {
  return relay.trim().replace(/\/+$/, '');
}

function normalizeRelays(relays: string[] | undefined): string[] {
  const source = relays && relays.length > 0 ? relays : DEFAULT_RELAYS;
  return getEffectiveRelayUrls(source.map(normalizeRelay).filter(Boolean));
}

function compressedPeerIdToXOnly(peerId: string): string {
  const normalized = peerId.trim().toLowerCase();
  return /^(02|03)[0-9a-f]{64}$/.test(normalized) ? normalized.slice(2) : normalized;
}

function ensurePeer(peerId: string): P2PPeerState {
  const normalized = peerId.trim().toLowerCase();
  const existing = peerStats.get(normalized);
  if (existing) return existing;
  const created: P2PPeerState = {
    peerId: normalized,
    pubkey: compressedPeerIdToXOnly(normalized),
    connected: false,
    pool: 'other',
    bytesSent: 0,
    bytesReceived: 0,
    requestsSent: 0,
    requestsReceived: 0,
    responsesSent: 0,
    responsesReceived: 0,
    forwardedRequests: 0,
    forwardedResolved: 0,
    forwardedSuppressed: 0,
    sessionsEstablished: 0,
    lastStateAt: Date.now(),
  };
  peerStats.set(normalized, created);
  return created;
}

function updateDebugState(): void {
  const peers = [...peerStats.values()].sort((left, right) => left.peerId.localeCompare(right.peerId));
  const active = provider !== null;
  const relays = currentRelays.map((url) => ({
    url,
    status: active ? 'connected' as const : 'connecting' as const,
  }));
  const xOnlyPubkey = identity ? toHex(identity.xOnlyPubkey) : null;
  const localPeerId = identity ? toHex(identity.publicKey) : null;
  const state: P2PState = {
    started: active,
    peerCount: peers.filter((peer) => peer.connected).length,
    relayCount: relays.length,
    connectedRelayCount: active ? relays.length : 0,
    pubkey: xOnlyPubkey,
    npub: xOnlyPubkey ? npubFromHex(xOnlyPubkey) : null,
    peerId: localPeerId,
    discoveryScope: DEFAULT_FIPS_DISCOVERY_APP,
    blobRoutes: activeBlobRoutes.map((route) => ({ ...route })),
    peers,
    relays,
    blossomBandwidth: {
      totalBytesSent: currentBlossomBandwidth.totalBytesSent,
      totalBytesReceived: currentBlossomBandwidth.totalBytesReceived,
      updatedAt: currentBlossomBandwidth.updatedAt,
      servers: currentBlossomBandwidth.servers.map((server) => ({ ...server })),
    },
  };
  p2pStore.set(state);
  if (typeof window !== 'undefined') window.__hashtreeCcP2P = state;
}

function setupBlossomBandwidthSync(): void {
  if (blossomBandwidthUnsubscribe) return;
  blossomBandwidthUnsubscribe = blossomBandwidthStore.subscribe((stats) => {
    currentBlossomBandwidth = {
      totalBytesSent: stats.totalBytesSent,
      totalBytesReceived: stats.totalBytesReceived,
      updatedAt: stats.updatedAt,
      servers: stats.servers.map((server) => ({ ...server })),
    };
    updateDebugState();
  });
}

function createLocalStoreAdapter(): Store {
  return {
    put: async (hash, data) => {
      const stored = await putBlob(data, 'application/octet-stream', false);
      return stored.hashHex === toHex(hash);
    },
    get: async (hash) => getBlobForPeer(toHex(hash)),
    has: async (hash) => !!await getBlobForPeer(toHex(hash)),
    delete: async () => false,
  };
}

export function getExplicitProviderRoutes(
  search = typeof window === 'undefined' ? '' : window.location.search,
): readonly { peerId: string; htl: number }[] {
  const peerId = new URLSearchParams(search).get(SHARE_PROVIDER_QUERY)?.trim().toLowerCase();
  if (!peerId) return [];
  if (!/^(02|03)[0-9a-f]{64}$/.test(peerId)) {
    throw new Error('Shared Hashtree provider identity is invalid');
  }
  return [{ peerId, htl: REMOTE_BLOB_HTL }];
}

function getDeviceIdentity(): Promise<FipsIdentity> {
  identityPromise ??= new IndexedDbIdentityStore('hashtree-cc:fips').getOrCreateIdentity();
  return identityPromise;
}

async function stopProvider(): Promise<void> {
  setP2PProvider(null);
  for (const unsubscribe of providerUnsubscribes.splice(0)) unsubscribe();
  const active = provider;
  provider = null;
  activeBlobRoutes = [];
  peerStats.clear();
  await active?.stop().catch(() => undefined);
}

function handlePeerEvent(event: PeerEvent): void {
  const peer = ensurePeer(event.remotePubkey);
  peer.connected = event.state === 'connected';
  peer.lastStateAt = Date.now();
  updateDebugState();
}

function handleSessionEvent(event: SessionEvent): void {
  if (event.state !== 'established') return;
  const peer = ensurePeer(event.remotePubkey);
  peer.sessionsEstablished += 1;
  updateDebugState();
}

function syncFipsSession(relays: string[]): Promise<void> {
  const normalized = normalizeRelays(relays);
  const relaysKey = normalized.join(',');
  if (relaysKey === desiredRelaysKey) return syncTail;
  desiredRelaysKey = relaysKey;
  const version = ++syncVersion;
  syncTail = syncTail.catch(() => undefined).then(async () => {
    if (version !== syncVersion || relaysKey === activeRelaysKey) return;
    await stopProvider();
    if (version !== syncVersion) return;
    currentRelays = normalized;
    updateDebugState();
    try {
      identity = await getDeviceIdentity();
      const providerRoutes = getExplicitProviderRoutes();
      const next = await createBrowserHashtreeFipsProvider({
        identity,
        relays: currentRelays,
        localStore: createLocalStoreAdapter(),
        discoveryApp: DEFAULT_FIPS_DISCOVERY_APP,
        providerRoutes,
        forwarding: true,
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
      });
      if (version !== syncVersion) {
        await next.stop();
        return;
      }
      provider = next;
      activeBlobRoutes = providerRoutes.map((route) => ({ ...route }));
      providerUnsubscribes = [
        next.node.on('peer', (event) => handlePeerEvent(event as PeerEvent)),
        next.node.on('session', (event) => handleSessionEvent(event as SessionEvent)),
      ];
      setP2PProvider(providerRoutes.length > 0 ? next : null);
      activeRelaysKey = relaysKey;
      updateDebugState();
    } catch (error) {
      if (version === syncVersion) desiredRelaysKey = '';
      console.warn('[quick-share:fips] failed to start', error);
      updateDebugState();
    }
  });
  return syncTail;
}

function setupSettingsSync(): void {
  if (settingsUnsubscribe) return;
  settingsUnsubscribe = settingsStore.subscribe((settings) => {
    void syncFipsSession(settings.network.relays);
  });
}

export async function initP2P(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    setupSettingsSync();
    setupBlossomBandwidthSync();
    await syncFipsSession(settingsStore.getState().network.relays);
    if (!statsTimer) statsTimer = setInterval(updateDebugState, STATS_INTERVAL_MS);
    updateDebugState();
  })();
  return initPromise;
}

export async function getLocalProviderPeerId(): Promise<string> {
  identity ??= await getDeviceIdentity();
  return toHex(identity.publicKey);
}

export async function waitForExplicitProviderRoute(): Promise<void> {
  await initP2P();
  const route = activeBlobRoutes[0];
  if (!route || (peerStats.get(route.peerId)?.sessionsEstablished ?? 0) > 0) return;
  const active = provider;
  if (!active) throw new Error('Shared Hashtree provider is unavailable');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let unsubscribe = () => {};
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => {
      finish(new Error('Shared Hashtree provider did not connect'));
    }, PROVIDER_CONNECT_TIMEOUT_MS);
    unsubscribe = active.node.on('session', (event) => {
      const session = event as SessionEvent;
      if (session.remotePubkey === route.peerId && session.state === 'established') finish();
    });
    if (settled) unsubscribe();
    else if ((peerStats.get(route.peerId)?.sessionsEstablished ?? 0) > 0) finish();
  });
}
