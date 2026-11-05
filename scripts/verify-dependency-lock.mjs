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
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.56/fips-core-0.0.52.tgz",
    "integrity": "sha512-omsxRDNQ0iqEBipCD0sOhodDYm0p8cnjt/6BmcDBvtDgQx9F+wL0LXO8hN7MtqZ7KI40wc/gACAudP2+gscXew=="
  },
  "@fips/tcp": {
    "url": "https://github.com/mmalmi/fips-tcp/releases/download/fips-tcp-v0.2.4/fips-tcp-0.2.3.tgz",
    "integrity": "sha512-0j7ucAgb7SFLkHHKMjJmR4v29psVmGoShiSgpba5IgJqAT/lJGTTKlHoAItKie+oNsiPGf/ww4YMuLTRYov2TA=="
  },
  "@fips/transport-webrtc": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.57/fips-transport-webrtc-0.0.56.tgz",
    "integrity": "sha512-rxRtF4TLPuRicue+GeuG/jsIJXFUmOYRLQDlgULJYMPFcf1JO1dD1B7RgrjT+bF6ssGrNoNP+NUd77lKnTli2Q=="
  },
  "@fips/transport-websocket": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.54/fips-transport-websocket-0.0.9.tgz",
    "integrity": "sha512-y9SkW2IbTt9ElXO89+184PuYCnMyODtojeKfzQg34iQIOpEpebvi/mPzvZjWNFk6e2gAfu3aG1/V+TiSU9XsFA=="
  },
  "@hashtree/collection": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-collection-0.2.11.tgz",
    "integrity": "sha512-FI6cVBneXSgOEAEeZH6Yv12eC+pZpG2kTCHc9Bt4+bW6Vu0nVNo5V3Gtt5Dk9p8l7G47sq/R9CBbo6A0D+dVwA=="
  },
  "@hashtree/core": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-core-0.4.0.tgz",
    "integrity": "sha512-hdqjU1MoGjc55BL5WM93jgVxW7cYOWCWHcYUl5glUT8boEinFfmlmnhyjGp7TNwWgxZKQ7Rgag9XiyDnRUGBUA=="
  },
  "@hashtree/dexie": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-dexie-0.1.13.tgz",
    "integrity": "sha512-i34YCDwA+d4puwtC2f+4NreOLRC/RRTOe3PDHXctJvaqg2Ig+xpGcb2I1cbjjCY0cVJ8/BTemNYrH0LfXckPwQ=="
  },
  "@hashtree/fips-transport": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-fips-transport-0.4.24.tgz",
    "integrity": "sha512-86f/HNa0R/0yLPXUKynlmAZqdAk9bxrgLVnAygNDOAQflsraWjYjltbmAXpQF2f6RMRvp4pKqVFyhjmle50Gbg=="
  },
  "@hashtree/index": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-index-0.1.15.tgz",
    "integrity": "sha512-EnXs4hE0fxCzQfruEsjO9YVBTpzb3Rr1k1vF6p7gLgpZ2oIEg4DEv/pZji9uj7/qJYqOa+EsZTjA0lT0SZozdA=="
  },
  "@hashtree/mesh": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-mesh-0.3.3.tgz",
    "integrity": "sha512-fiLvKjbEO1J/fuj6wcLGjI3RPsPrGgSuc2O+QqN/vX3OSHI7uPS+feH49vFduUMHYM79Yvsrq6MV2XDUiGq59A=="
  },
  "@hashtree/nostr": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-nostr-0.2.6.tgz",
    "integrity": "sha512-rLumTs98r1AFAaYu1bnY7MUiF7M5hsehjnjB4GV7b68OBcdGpyWqT6ccBULmH4VLstyCU6d/qYxqu3ctlZbjUg=="
  },
  "@hashtree/nostr-pubsub": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-nostr-pubsub-0.1.9.tgz",
    "integrity": "sha512-7QfJ1LwAYb8ThdA/ECXJQYxh7BjQk/gTQS+XAfnZvzjxx5YSDRjGj+7bqLtbDdIAPDuIA9dUNYCfH8oj9RLdPQ=="
  },
  "@hashtree/worker": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.34/hashtree-worker-0.4.21.tgz",
    "integrity": "sha512-xnrwHYb9JUxR6vNtu0Fwhr+937rC5kJqRmVG3LUNiDdNzXr6jnkDIxU7c+gR7VHbYnXR30eKngnF7AkUyOZM5Q=="
  },
  "nostr-pubsub": {
    "url": "https://github.com/mmalmi/nostr-pubsub/releases/download/nostr-pubsub-ts-v0.5.20/nostr-pubsub-0.5.20.tgz",
    "integrity": "sha512-1Cwdk2LR4oCtxiOR1t5+KmdrzDUKrqZfbIZzpXrOR0g+Ex3DCZ33him/qPWU/iYTChPl9eUgi1ZdhL0KdQWZWQ=="
  },
  "nostr-social-graph": {
    "url": "https://github.com/mmalmi/nostr-social-graph/releases/download/v4.0.2/nostr-social-graph-4.0.2.tgz",
    "integrity": "sha512-F2EKjnxS58WPOF3UmhM13xwjFDmMMkz/XFctv//efPk/cfxViPfhmQl1PlxI9G8+mULKNPxY39vC1Dka3g0Ykw=="
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
