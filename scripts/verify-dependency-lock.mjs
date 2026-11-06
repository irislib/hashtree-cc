import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const releases = {
  "@fips/browser": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.59/fips-browser-0.0.19.tgz",
    "integrity": "sha512-f2TqiQ+XKSupPtYnjtHBSWSVocVa8RT26xivVf4FbcipH6t/bOSCBuHuWoY2crozj7MRrtqImGsq/reulVy+Ng=="
  },
  "@fips/core": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.59/fips-core-0.0.54.tgz",
    "integrity": "sha512-Ugzc8fdCr634XcExsGRC8oQpC5ZgJdiejt71N8auSlhJxFhf5tZcdR+dlbSYrlvQDh73jvyBkfXVeqQquR/Z6A=="
  },
  "@fips/tcp": {
    "url": "https://github.com/mmalmi/fips-tcp/releases/download/fips-tcp-v0.2.4/fips-tcp-0.2.3.tgz",
    "integrity": "sha512-0j7ucAgb7SFLkHHKMjJmR4v29psVmGoShiSgpba5IgJqAT/lJGTTKlHoAItKie+oNsiPGf/ww4YMuLTRYov2TA=="
  },
  "@fips/transport-webrtc": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.59/fips-transport-webrtc-0.0.58.tgz",
    "integrity": "sha512-JLhrH4onQBbMkuJgApyc9ADLUVDegPywVSA9+UnrSI9zkftIKwGD7fKBKigq5pCW3NQkoLG8KxJPiHTLvsswag=="
  },
  "@fips/transport-websocket": {
    "url": "https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.59/fips-transport-websocket-0.0.12.tgz",
    "integrity": "sha512-vblFMNIcC4wWSAHrnnAP39spJZeaUTJpNesWGMzx7AJJqT0yt94j0wSCoujiXsXGLbDXajI6OkrPkgOcQSCNGA=="
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
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.38/hashtree-fips-transport-0.5.0.tgz",
    "integrity": "sha512-1hUDOllGMrhtcfs9YosXqdNE7VVqEhe45uHB92AK4UTrlTFitin6NVWTdGnDVNBImPA2doPkJSmBdlBMF4N17A=="
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
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.40/hashtree-nostr-0.2.7.tgz",
    "integrity": "sha512-ah0pS1PDckTkz/QntsNn9D9aFPcJWb7BDjBvaVtY9gaWryiWMvXv0QaGbTU5aGIqRd32BLmnojNDXHPJ/IkIhQ=="
  },
  "@hashtree/nostr-pubsub": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.27/hashtree-nostr-pubsub-0.1.9.tgz",
    "integrity": "sha512-7QfJ1LwAYb8ThdA/ECXJQYxh7BjQk/gTQS+XAfnZvzjxx5YSDRjGj+7bqLtbDdIAPDuIA9dUNYCfH8oj9RLdPQ=="
  },
  "@hashtree/worker": {
    "url": "https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.41/hashtree-worker-0.4.25.tgz",
    "integrity": "sha512-viUPl2JUtrfJENEWZPvaTtT5x73Pvj5EmHn7qjsTP5T01uOg0tDm7xJww3cf6x23LILi6drOh97ss0WWYq/KVA=="
  },
  "nostr-pubsub": {
    "url": "https://github.com/mmalmi/nostr-pubsub/releases/download/nostr-pubsub-ts-v0.5.20/nostr-pubsub-0.5.20.tgz",
    "integrity": "sha512-1Cwdk2LR4oCtxiOR1t5+KmdrzDUKrqZfbIZzpXrOR0g+Ex3DCZ33him/qPWU/iYTChPl9eUgi1ZdhL0KdQWZWQ=="
  },
  "nostr-social-graph": {
    "url": "https://github.com/mmalmi/nostr-social-graph/releases/download/v4.0.4/nostr-social-graph-4.0.4.tgz",
    "integrity": "sha512-7lMB0fYsjIBQwn/03lY8+0gq41rzifG4hmp5iczjrdBZ/FWQQvkkrH2HGtL80lMhkYr5+UqV63DaBdtoaReDtA=="
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
