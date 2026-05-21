# @hashtree/nostr

Nostr ref resolving, signed root snapshots, and event storage for hashtree.

## Install

```bash
npm install @hashtree/nostr
```

## P2P Transport

P2P blob fetching is provided by `@hashtree/fips-transport`. FIPS owns peer
discovery, signaling, and WebRTC/UDP links; Hashtree carries verified mesh blob
frames over the FIPS node endpoint.

## Nostr Ref Resolver

Resolve `npub/treename` references to merkle root hashes via Nostr events.

### Event Format

Trees are published as **kind 30078** (parameterized replaceable with label):

```
npub1abc.../treename/path/to/file.ext
      │        │           │
      │        │           └── Path within merkle tree (client-side traversal)
      │        └── d-tag value (tree identifier)
      └── Author pubkey (bech32 → hex for event)
```

**Tags:**
| Tag | Purpose |
|-----|---------|
| `d` | Tree name (replaceable event key) |
| `l` | `"hashtree"` label for discovery |
| `hash` | Merkle root SHA256 (64 hex chars) |
| `key` | Decryption key (public trees) |
| `encryptedKey` | XOR'd key (link-visible trees) |
| `selfEncryptedKey` | NIP-44 encrypted (private/link-visible) |

**Visibility:**
- **Public**: plaintext `key` tag
- **Link-visible**: `encryptedKey` + link key in share URL
- **Private**: only `selfEncryptedKey` (owner access)

### Usage

```typescript
import { createNostrRefResolver } from '@hashtree/nostr';

const resolver = createNostrRefResolver({
  subscribe: (filters, onEvent) => { /* your relay client subscribe callback */ },
  publish: (event) => { /* your relay client publish callback */ },
});

const root = await resolver.resolve('npub1.../myfiles');
```

## License

MIT
