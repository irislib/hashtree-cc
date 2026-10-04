import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const releases = {
  "@fips/browser": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.55/fips-browser-0.0.17.tgz",
    "integrity": "sha512-AASnq0OizIitTHvLiOkKFMUK4qbGMF9CHJcPzZM3hLjFcNFqMMNk4TBvTPjjlXiVgJrLRzLRaz2SpzeyEZu3Qg=="
  },
  "@fips/core": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.53/fips-core-0.0.51.tgz",
    "integrity": "sha512-rY3FBFwAbigsnKaLdjoAm9aFqAe7RVeMHt8+DZ8Xd7sc0RtBidBHBTVXOqD8DGLnJbGesKkvGo1dosbCSps9rA=="
  },
  "@fips/tcp": {
    "url": "https://github.com/mmalmi/fips-tcp/releases/download/v0.2.0/fips-tcp-0.2.0.tgz",
    "integrity": "sha512-KCJmltpx4cH76Sp+GOKJvYzQpwUTUtmyBA5bgcfS36ty8AxSgBQZxLdBwM59IER+B/rZpjRYFtqE6MPePL0o+w=="
  },
  "@fips/transport-webrtc": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.53/fips-transport-webrtc-0.0.54.tgz",
    "integrity": "sha512-fEpQaXCscY0YZzAJoNaPPPZcGp/rZ1Ny6tj0OsVoBezfXDGV9X4+LynMkBVNK8vHllgconWC4u298+7WdciBNQ=="
  },
  "@fips/transport-websocket": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.54/fips-transport-websocket-0.0.9.tgz",
    "integrity": "sha512-y9SkW2IbTt9ElXO89+184PuYCnMyODtojeKfzQg34iQIOpEpebvi/mPzvZjWNFk6e2gAfu3aG1/V+TiSU9XsFA=="
  },
  "@hashtree/collection": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-collection-0.2.10.tgz",
    "integrity": "sha512-K50NRsrVm3a9JA24zH5E+F3ve31ibb3fYeE6L8J1hSHCBYEuNqn2r4/awXC1mheMehG8r2074dfWe8n0qPe4oA=="
  },
  "@hashtree/core": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-core-0.3.2.tgz",
    "integrity": "sha512-OLd2ARbYKt9s7wipMX58OhJwZQ6XwIdkuJ+Zfp+NNz3rjXDV8kYl67S9HlrXOj5eSsy5SbN/JuKS8QuwXzEiRQ=="
  },
  "@hashtree/dexie": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-dexie-0.1.11.tgz",
    "integrity": "sha512-NGe+rKVuyBrhlWeIemO0Hzd/mAcuN+PqpXYeg508dlvwuRrl+0GNIwRwPVh7e7Zg5VlwiKaN6E5itp9W6EZEGg=="
  },
  "@hashtree/fips-transport": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.20/hashtree-fips-transport-0.4.21.tgz",
    "integrity": "sha512-VcVFj6GQeousx7w7WH7/sAETlvQSdh8KGBD1CBGGV2XKxvjz4lgtrBlXNdMnjlkd3eRUOxoBOMc+rQvtVYBF8w=="
  },
  "@hashtree/index": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-index-0.1.14.tgz",
    "integrity": "sha512-5JAekyGQAb+6yhXramZhzaKZ8I8HpVrnDd6SZCF6y3sYOLge2zAPep0MpPJtYpNsD3HdXCIhUL1JK40YvKCgHA=="
  },
  "@hashtree/mesh": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-mesh-0.3.2.tgz",
    "integrity": "sha512-lYHxC3N3TWAVlxdudVkTGcrz9eb0k27nwhUZTFN9AUOvGqNV9q7aFVM6VG/RjD2mdMh9s900s2uUGxDK/5D+TQ=="
  },
  "@hashtree/nostr": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.9/hashtree-nostr-0.2.5.tgz",
    "integrity": "sha512-SSFQtQOVxKPVoU4K9H/TunB7nRdyCqpjYaQV1KFV6goUAJRKFA4jqtI8PiNeSR/PmBL39jovw2bwWdPZbh/7Hg=="
  },
  "@hashtree/nostr-pubsub": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.11/hashtree-nostr-pubsub-0.1.7.tgz",
    "integrity": "sha512-BmxKhtPatqoBCYojjz6+Z6/ghsfiJPuyy2mM0ePstpm2nJkP34QPYv+WiJStpUT5TUDdfwxeEYqGYJCzLex9Nw=="
  },
  "@hashtree/worker": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.19/hashtree-worker-0.4.11.tgz",
    "integrity": "sha512-3lKJ/sic9u0Mc5RhdQNP9aG9SsfvHc7WIjCEBxqNps/JicROjjYKhuPuLKA0oY5LjwA7DhZJfXImcaguyBgM7w=="
  },
  "nostr-pubsub": {
    "url": "https://github.com/mmalmi/nostr-pubsub/releases/download/nostr-pubsub-ts-v0.5.13/nostr-pubsub-0.5.13.tgz",
    "integrity": "sha512-iL94fAtLDh5agPo/4qOgfy5QUmQL2GY/LFL4zp/H9U6St1+hJpLAcrA4eQLZlwyvtIXQu1tOtpdHkuhu4wEZ9A=="
  },
  "nostr-social-graph": {
    "url": "https://github.com/mmalmi/nostr-social-graph/releases/download/v2.0.3/nostr-social-graph-2.0.3.tgz",
    "integrity": "sha512-mdPbzA0PAApbAmwrUFEvTDp/XQ4phzFCpNwwlSSXhqOBRweLRO8m6AtDoURwIEYJN4GJcDuR173ppjxCRrZhnw=="
  }
};

for (const name of [
  '@fips/browser',
  '@fips/core',
  '@fips/transport-webrtc',
  '@hashtree/core',
  '@hashtree/fips-transport',
  '@hashtree/nostr',
  '@hashtree/worker',
  'nostr-social-graph',
]) {
  if (manifest.dependencies?.[name] !== releases[name].url) {
    throw new Error(`${name} must use immutable release ${releases[name].url}`);
  }
}

for (const [name, specifier] of Object.entries(manifest.dependencies ?? {})) {
  if (specifier.startsWith('file:') || specifier.startsWith('link:')) {
    throw new Error(`${name} must not depend on a mutable sibling workspace`);
  }
}
if (/\b(?:file|link):\.\.\//.test(lockfile)) {
  throw new Error('Lockfile must not resolve mutable sibling workspaces');
}
if (workspace.includes("'packages/*'") || workspace.includes('"packages/*"')) {
  throw new Error('Released shared libraries must not be copied into this workspace');
}

for (const [name, release] of Object.entries(releases)) {
  const quotedKey = `  '${name}@${release.url}':`;
  const plainKey = `  ${name}@${release.url}:`;
  const start = Math.max(lockfile.indexOf(quotedKey), lockfile.indexOf(plainKey));
  const end = lockfile.indexOf('\n\n', start);
  const entry = start >= 0 ? lockfile.slice(start, end < 0 ? undefined : end) : '';
  if (!entry.includes(`tarball: ${release.url}`) || !entry.includes(`integrity: ${release.integrity}`)) {
    throw new Error(`${name} lock entry is missing its verified release integrity`);
  }
}

for (const script of ['build', 'test', 'test:e2e', 'test:release']) {
  if (!manifest.scripts?.[script]?.startsWith('pnpm run verify:dependency-lock')) {
    throw new Error(`${script} must verify immutable dependency integrity first`);
  }
}

if (/ndk(?:-cache)?@|@nostr-dev-kit\//.test(lockfile)) {
  throw new Error('Unused NDK compatibility packages must not return');
}

console.log('Verified immutable shared runtime release integrity');
