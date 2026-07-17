import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const fipsRoot = 'https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.26';
const tcpRoot = 'https://github.com/mmalmi/fips-tcp/releases/download/v0.2.0';
const hashtreeRoot =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.5.0';
const kitRoot = 'https://github.com/mmalmi/iris-kit/releases/download/runtime-v0.2.2';

const releases = {
  '@fips/browser': {
    url: `${fipsRoot}/fips-browser-0.0.8.tgz`,
    integrity: 'sha512-X7pHxIoPEvWP7U8cJkA6sKFOK7c/UKyKHkNPvsqRcRvE4uCQuGZpizIhEPqtpM4nU4ZQCU8ApnSC0zEQ8J8q7Q==',
  },
  '@fips/core': {
    url: `${fipsRoot}/fips-core-0.0.26.tgz`,
    integrity: 'sha512-plDWMSHjjVyH4BnkO4GgZcvpgIV6LTFspcWF1Gg0LE7sI+dAsqHP+OfAP6VKBh91QX6SSvJ2G4TJI28nfbNsLA==',
  },
  '@fips/tcp': {
    url: `${tcpRoot}/fips-tcp-0.2.0.tgz`,
    integrity: 'sha512-KCJmltpx4cH76Sp+GOKJvYzQpwUTUtmyBA5bgcfS36ty8AxSgBQZxLdBwM59IER+B/rZpjRYFtqE6MPePL0o+w==',
  },
  '@fips/transport-webrtc': {
    url: `${fipsRoot}/fips-transport-webrtc-0.0.42.tgz`,
    integrity: 'sha512-vqbMj4mgJdS5sAXYLe4kb9B3ZtdnNFsQof3y0W2vF4TruccMH48AmxY+J6gOKCwhOHkFFgJ9V/4m1MVKzLsIiw==',
  },
  '@hashtree/collection': {
    url: `${hashtreeRoot}/hashtree-collection-0.2.8.tgz`,
    integrity: 'sha512-lS6IvLV6WqH7KSe570ula1rRC2e9qk4nOIb07a0WcoKGnXAS3PZiy9qavzy0Zy5k8TIZegf9gOr1B6F1yusmoA==',
  },
  '@hashtree/core': {
    url: `${hashtreeRoot}/hashtree-core-0.3.0.tgz`,
    integrity: 'sha512-kh4ZhzsJTd/iLAYUeZ/+Q9EzA/Ev9FObOLcOveIvx7Ghtk6qdeiTexoGCOiu5X8VmlksxRPleCVeMh1k9/2AGA==',
  },
  '@hashtree/dexie': {
    url: `${hashtreeRoot}/hashtree-dexie-0.1.8.tgz`,
    integrity: 'sha512-edM50fsiMYYmkTl7OkyRIV+1K5mhbTGnAliIvcJFzKlQ4++kdDIuBlHw/WrkKENgDgTEYXeta7pKbdXxyL906w==',
  },
  '@hashtree/fips-transport': {
    url: `${hashtreeRoot}/hashtree-fips-transport-0.4.4.tgz`,
    integrity: 'sha512-S4xCmpPnMzQG2ADc6p4mv+JSubtaRr6eOLyZs1utk0ac1bLumf261qy8fZqJj/MuoYSS2Y5J4uXYKyResG/bdA==',
  },
  '@hashtree/index': {
    url: `${hashtreeRoot}/hashtree-index-0.1.12.tgz`,
    integrity: 'sha512-tXCCaYCwUFAkNDdO7RJ9EMY3AQe89O5aJAXtbAYcMtCaZ2uBxH9QGkQP2pKeUYorYx3MJIcubOF6ia2slEJAdw==',
  },
  '@hashtree/mesh': {
    url: `${hashtreeRoot}/hashtree-mesh-0.2.0.tgz`,
    integrity: 'sha512-ACtpqCVXVeLhEJLmOYWH6xIyuw5MbRVDa+pSw/VDjyqV3+BSDVHsX+cnc5mHTuFjXjwin7qpWAw66d9zlw1T0w==',
  },
  '@hashtree/nostr': {
    url: `${hashtreeRoot}/hashtree-nostr-0.1.18.tgz`,
    integrity: 'sha512-STk0IFdMMvMLUvsvYtXpPukdE5/6lykcvJ/0JTZh/bqUgPTKCj7OzKwmqEgBSQBRUbiJ9R+J7Z6bx1z+O3jaxA==',
  },
  '@hashtree/worker': {
    url: `${hashtreeRoot}/hashtree-worker-0.4.0.tgz`,
    integrity: 'sha512-nqKAO7y4PfA2vNRf0PKqsIEOACq5o/Si/XwlgHtHScevmxHK7sIZqdvSFHQI67yxTSjlfB2hkBcBMkGxGrMi2A==',
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
