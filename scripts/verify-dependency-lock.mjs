import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const fipsRoot = 'https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.29';
const tcpRoot = 'https://github.com/mmalmi/fips-tcp/releases/download/v0.2.0';
const hashtreeBaseRoot =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.0';
const hashtreeRoot =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.1';
const hashtreeFipsRoot =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.5';
const kitRoot = 'https://github.com/mmalmi/iris-kit/releases/download/runtime-v0.2.2';

const releases = {
  '@fips/browser': {
    url: `${fipsRoot}/fips-browser-0.0.11.tgz`,
    integrity: 'sha512-z5OC/hQSa7UB8YBAniRcjB+sD/JlwEWJ8ebL9SKOjh0sQ2BO0INTOXPIolDY89MBRZLHkVmjZAShDf1W+tLORA==',
  },
  '@fips/core': {
    url: `${fipsRoot}/fips-core-0.0.29.tgz`,
    integrity: 'sha512-C5GN4Fj7D3X9riGaZwej9aoVsLG7TI8ar4RvT25Wmv+tiLsGWSY2Gn7wGAzYHqhhT7wVonc5cMjfs95qjdUwWQ==',
  },
  '@fips/tcp': {
    url: `${tcpRoot}/fips-tcp-0.2.0.tgz`,
    integrity: 'sha512-KCJmltpx4cH76Sp+GOKJvYzQpwUTUtmyBA5bgcfS36ty8AxSgBQZxLdBwM59IER+B/rZpjRYFtqE6MPePL0o+w==',
  },
  '@fips/transport-webrtc': {
    url: `${fipsRoot}/fips-transport-webrtc-0.0.45.tgz`,
    integrity: 'sha512-aRonAlsJz56DlyBsc/IBMkKmKmrYuMuq24YLWbHfi8NmTphv6nOupWK3Tpd7DJphXgqCgKi2CnqW7PI6H2+bNw==',
  },
  '@fips/transport-websocket': {
    url: `${fipsRoot}/fips-transport-websocket-0.0.3.tgz`,
    integrity: 'sha512-/K+DCBHoTyGtxEqjK4SquQ1Ua8hPjZokzQCmPtEJachd8CeQmDcmGUugRSWs9/FrVBwvfqi11DXs8eK+MZfp5Q==',
  },
  '@hashtree/collection': {
    url: `${hashtreeBaseRoot}/hashtree-collection-0.2.8.tgz`,
    integrity: 'sha512-lS6IvLV6WqH7KSe570ula1rRC2e9qk4nOIb07a0WcoKGnXAS3PZiy9qavzy0Zy5k8TIZegf9gOr1B6F1yusmoA==',
  },
  '@hashtree/core': {
    url: `${hashtreeRoot}/hashtree-core-0.3.0.tgz`,
    integrity: 'sha512-kh4ZhzsJTd/iLAYUeZ/+Q9EzA/Ev9FObOLcOveIvx7Ghtk6qdeiTexoGCOiu5X8VmlksxRPleCVeMh1k9/2AGA==',
  },
  '@hashtree/dexie': {
    url: `${hashtreeBaseRoot}/hashtree-dexie-0.1.8.tgz`,
    integrity: 'sha512-edM50fsiMYYmkTl7OkyRIV+1K5mhbTGnAliIvcJFzKlQ4++kdDIuBlHw/WrkKENgDgTEYXeta7pKbdXxyL906w==',
  },
  '@hashtree/fips-transport': {
    url: `${hashtreeFipsRoot}/hashtree-fips-transport-0.4.6.tgz`,
    integrity: 'sha512-2dChAbKMmkuyGrqpHGgaTcCZ6Kargb7nPVbH6zdslb3ptssSUVlPF7xtLGuXZPNmN3atCj1LQ+vD8YdGtOj2fw==',
  },
  '@hashtree/index': {
    url: `${hashtreeBaseRoot}/hashtree-index-0.1.12.tgz`,
    integrity: 'sha512-tXCCaYCwUFAkNDdO7RJ9EMY3AQe89O5aJAXtbAYcMtCaZ2uBxH9QGkQP2pKeUYorYx3MJIcubOF6ia2slEJAdw==',
  },
  '@hashtree/mesh': {
    url: `${hashtreeRoot}/hashtree-mesh-0.3.0.tgz`,
    integrity: 'sha512-VNy7XxQCHVaBYVubbktmVve05B+jMa5Wriq2jWGU3hiIfsyz1JicGzphG0g8pyJHjJ5gpz6UP/bnZL5bMRnViw==',
  },
  '@hashtree/nostr': {
    url: `${hashtreeRoot}/hashtree-nostr-0.2.0.tgz`,
    integrity: 'sha512-H+E91/nhktH1iVwRWaMI1cpetatq++I5N7Arza5MrlopFKUKnsZ323PWa//Uc1+hype70SKVuY4ljlGHwOcpZg==',
  },
  '@hashtree/worker': {
    url: `${hashtreeRoot}/hashtree-worker-0.4.1.tgz`,
    integrity: 'sha512-EJqOBIJ61as+njOaYtvf4Px645xf5cX9RKZYdXeUUnjZ3OeNK0trk2TaYsz3uiPQDJJPwDpxKFeGPyIs/kFbnw==',
  },
  ndk: {
    url: `${kitRoot}/ndk-0.2.1.tgz`,
    integrity: 'sha512-ipX47l/sNwq8uq3xrUabLFEhxExaaiQg7Q7KO/ik3e3bdTlW3fLtvfsb3k21uLjGdf0c179k/m0i8oqYnfSQ2A==',
  },
  'ndk-cache': {
    url: `${kitRoot}/ndk-cache-0.2.1.tgz`,
    integrity: 'sha512-pZWVFey1hsaviBa50inBY17WUbjs29fzReuLWFp7Ud+Sgu1H0RzeYySRQwYS8KI0qt9f+gDq3lIMrTqFPk+wYA==',
  },
  'nostr-social-graph': {
    url: 'https://github.com/mmalmi/nostr-social-graph/releases/download/v2.0.0/nostr-social-graph-2.0.0.tgz',
    integrity: 'sha512-DLe0wbmkfuXl9PoF67aJsyq9nsBX2TV/YXDKJSG8WHcAIgHWQiGcSmN/ogT5XhTejw8o8rcywfgtfSDcv6Cf8w==',
  },
};

for (const name of [
  '@fips/browser',
  '@fips/core',
  '@fips/transport-webrtc',
  '@hashtree/core',
  '@hashtree/fips-transport',
  '@hashtree/nostr',
  '@hashtree/worker',
  'ndk',
  'ndk-cache',
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

console.log('Verified immutable shared runtime release integrity');
