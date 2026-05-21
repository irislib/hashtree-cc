/**
 * @hashtree/nostr - Nostr integration for hashtree
 *
 * Provides Nostr ref resolving and event storage. Transport-neutral mesh
 * primitives are re-exported for compatibility; blob transport now lives in
 * @hashtree/fips-transport so FIPS owns peer discovery and WebRTC/UDP links.
 */

export const DEFAULT_RELAYS: string[] = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://temp.iris.to',
  'wss://relay.snort.social',
];

export * from '@hashtree/mesh';

// Ref resolvers
export {
  createNostrRefResolver,
  // Legacy alias
  createNostrRefResolver as createNostrRootResolver,
  type NostrRefResolverConfig,
  // Legacy alias
  type NostrRefResolverConfig as NostrRootResolverConfig,
  type NostrEvent,
  type NostrFilter,
  type Nip19Like,
  type VisibilityCallbacks,
  type ParsedTreeVisibility,
} from './resolver/index.js';

// Event storage and indexing
export {
  NostrEventStore,
  type StoredNostrEvent,
  type NostrEventManifest,
  type ListEventsOptions,
} from './events.js';

export {
  encodeSignedNostrEventJson,
  decodeSignedNostrEventJson,
  storeSignedNostrEventSnapshot,
  readSignedNostrEventSnapshot,
  parseHashtreeRootEvent,
  type ParsedHashtreeRootEvent,
} from './snapshot.js';
