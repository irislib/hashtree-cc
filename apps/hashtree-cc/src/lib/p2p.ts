import { fromHex, toHex, type Store } from '@hashtree/core';
import {
  createManagedNostrMeshSession,
  createSecretKeyEventSigner,
  createSecretKeyGiftUnwrapper,
  ManagedWebRTCMeshHost,
} from '@hashtree/worker/p2p';
import { DEFAULT_RELAYS as DEFAULT_NOSTR_RELAYS } from '@hashtree/nostr';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { writable } from 'svelte/store';
import {
  blossomBandwidthStore,
  getBlobForPeer,
  getWorkerClient,
  putBlob,
} from './workerClient';
import { settingsStore } from './settings';
import { getEffectiveRelayUrls } from './irisRuntimeNetwork';

const STATS_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 1_500;

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
  pool: 'follows' | 'other';
  bytesSent: number;
  bytesReceived: number;
  requestsSent: number;
  requestsReceived: number;
  responsesSent: number;
  responsesReceived: number;
  forwardedRequests: number;
  forwardedResolved: number;
  forwardedSuppressed: number;
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
  peers: [],
  relays: [],
  blossomBandwidth: DEFAULT_BLOSSOM_BANDWIDTH,
};

export const p2pStore = writable<P2PState>(DEFAULT_STATE);

const meshHost = new ManagedWebRTCMeshHost();

let secretKey: Uint8Array | null = null;
let publicKey: string | null = null;
let currentRelays: string[] = DEFAULT_RELAYS;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let settingsUnsubscribe: (() => void) | null = null;
let blossomBandwidthUnsubscribe: (() => void) | null = null;
let initPromise: Promise<void> | null = null;
let localStoreReadDepth = 0;
let currentBlossomBandwidth: BlossomBandwidthState = DEFAULT_BLOSSOM_BANDWIDTH;

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

function getRelayStates(): P2PRelayState[] {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const statuses = meshHost.getRelayConnectionStatus();
  const connected = new Set<string>();
  for (const [relayUrl, isConnected] of statuses.entries()) {
    if (isConnected) {
      connected.add(normalizeRelay(relayUrl));
    }
  }

  return currentRelays.map((relay) => {
    const normalized = normalizeRelay(relay);
    if (connected.has(normalized)) {
      return { url: relay, status: 'connected' };
    }
    if (meshHost.isActive() && online) {
      return { url: relay, status: 'connecting' };
    }
    return { url: relay, status: 'disconnected' };
  });
}

function updateDebugState(): void {
  const peers = meshHost.getPeerStats().map((peer) => ({
    peerId: peer.peerId,
    pubkey: peer.pubkey,
    connected: peer.connected,
    pool: peer.pool,
    bytesSent: peer.bytesSent,
    bytesReceived: peer.bytesReceived,
    requestsSent: peer.requestsSent,
    requestsReceived: peer.requestsReceived,
    responsesSent: peer.responsesSent,
    responsesReceived: peer.responsesReceived,
    forwardedRequests: peer.forwardedRequests,
    forwardedResolved: peer.forwardedResolved,
    forwardedSuppressed: peer.forwardedSuppressed,
  }));
  const relays = getRelayStates();
  const connectedRelayCount = relays.filter((relay) => relay.status === 'connected').length;

  const state: P2PState = {
    started: meshHost.isActive(),
    peerCount: peers.filter((peer) => peer.connected).length,
    relayCount: currentRelays.length,
    connectedRelayCount,
    pubkey: publicKey,
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
  if (typeof window !== 'undefined') {
    window.__hashtreeCcP2P = state;
  }
}

function setupBlossomBandwidthSync(): void {
  if (blossomBandwidthUnsubscribe) {
    return;
  }
  blossomBandwidthUnsubscribe = blossomBandwidthStore.subscribe((stats) => {
    currentBlossomBandwidth = {
      totalBytesSent: stats.totalBytesSent,
      totalBytesReceived: stats.totalBytesReceived,
      updatedAt: stats.updatedAt,
      servers: stats.servers.map((server) => ({
        url: server.url,
        bytesSent: server.bytesSent,
        bytesReceived: server.bytesReceived,
      })),
    };
    updateDebugState();
  });
}

async function createLocalStoreAdapter(): Promise<Store> {
  return {
    put: async (hash, data) => {
      const expectedHash = toHex(hash);
      const stored = await putBlob(data, 'application/octet-stream', false);
      return stored.hashHex === expectedHash;
    },
    get: async (hash) => withLocalStoreReadGuard(async () => getBlobForPeer(toHex(hash))),
    has: async (hash) => withLocalStoreReadGuard(async () => {
      const data = await getBlobForPeer(toHex(hash));
      return !!data;
    }),
    delete: async () => false,
  };
}

function getSessionSignature(): string {
  return JSON.stringify({
    pubkey: publicKey,
    relays: currentRelays,
  });
}

async function syncSession(force = false): Promise<void> {
  if (!publicKey || !secretKey) {
    return;
  }
  const localStore = await createLocalStoreAdapter();
  await meshHost.setSession(createManagedNostrMeshSession({
    signature: getSessionSignature(),
    pubkey: publicKey,
    relayUrls: currentRelays,
    localStore,
    signEvent: createSecretKeyEventSigner(secretKey),
    unwrapGift: createSecretKeyGiftUnwrapper(secretKey),
    publishMode: 'best-effort',
    getFollows: () => new Set<string>(),
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    closeLocalStore: async () => undefined,
    debug: false,
  }), force);
  updateDebugState();
}

function setupSettingsSync(): void {
  if (settingsUnsubscribe) {
    return;
  }
  let lastRelaysKey = '';
  settingsUnsubscribe = settingsStore.subscribe((settings) => {
    const nextRelays = normalizeRelays(settings.network.relays);
    const key = nextRelays.join(',');
    if (key === lastRelaysKey) {
      return;
    }
    lastRelaysKey = key;
    currentRelays = nextRelays;
    void syncSession().catch(() => undefined);
    updateDebugState();
  });
}

async function withLocalStoreReadGuard<T>(read: () => Promise<T>): Promise<T> {
  localStoreReadDepth += 1;
  try {
    return await read();
  } finally {
    localStoreReadDepth -= 1;
  }
}

export async function initP2P(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const settings = settingsStore.getState();
    currentRelays = normalizeRelays(settings.network.relays);
    secretKey = generateSecretKey();
    publicKey = getPublicKey(secretKey);

    const workerClient = await getWorkerClient();
    meshHost.attachWorkerClient(workerClient, {
      canFetch: () => localStoreReadDepth === 0,
    });

    await syncSession();
    setupSettingsSync();
    setupBlossomBandwidthSync();

    if (!statsTimer) {
      statsTimer = setInterval(updateDebugState, STATS_INTERVAL_MS);
    }
    updateDebugState();
  })();

  return initPromise;
}

export async function getFromP2P(hashHex: string): Promise<Uint8Array | null> {
  await initP2P();
  const controller = meshHost.getController();
  if (!controller) {
    return null;
  }
  return controller.get(fromHex(hashHex));
}
