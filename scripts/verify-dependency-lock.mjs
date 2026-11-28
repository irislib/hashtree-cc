import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const cohort = JSON.parse(await readFile(new URL('scripts/runtime-pins.json', root), 'utf8'));
const rootManifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const releases = { ...cohort.packages, '@iris/release-tools': {"url": "https://github.com/mmalmi/iris-kit/releases/download/runtime-v0.2.12/iris-release-tools-0.1.2.tgz", "integrity": "sha512-ZytyQLbDUYz/IcQ2rvUZZeFvT7FqwhRB3brZtuMwH7ILP/Jvui+ldDnKR8dNxxmIr02+PPyuv+VWKlRyaXCMbg=="} };
const unused = new Set(['@hashtree/git', '@hashtree/merge', '@fips/transport-memory', '@fips/transport-ethernet']);

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

if (manifest.devDependencies?.['@iris/release-tools'] !== releases['@iris/release-tools'].url) {
  throw new Error('@iris/release-tools must use its immutable release');
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
  if (unused.has(name)) continue;
  const quotedKey = `  '${name}@${release.url}':`;
  const plainKey = `  ${name}@${release.url}:`;
  const start = Math.max(lockfile.indexOf(quotedKey), lockfile.indexOf(plainKey));
  const end = lockfile.indexOf('\n\n', start);
  const entry = start >= 0 ? lockfile.slice(start, end < 0 ? undefined : end) : '';
  if (!entry.includes(`tarball: ${release.url}`) || !entry.includes(`integrity: ${release.integrity}`)) {
    throw new Error(`${name} lock entry is missing its verified release integrity`);
  }
}

// Reject stale nested records, even when a correct direct lock row also exists.
for (const [name, release] of Object.entries(cohort.packages)) {
  if (name === '@hashtree/git' || name === '@hashtree/merge') continue;
  if (rootManifest.pnpm?.overrides?.[name] !== release.url) {
    throw new Error(`${name} must override every nested consumer to the accepted release`);
  }
}
for (const [selector, value] of Object.entries(rootManifest.pnpm?.overrides ?? {})) {
  const target = selector.split('>').at(-1);
  if (cohort.packages[target] && value !== cohort.packages[target].url) {
    throw new Error(`Stale cohort override: ${selector}`);
  }
}
for (const line of lockfile.split('\n')) {
  const match = line.match(/^  '?((?:@(?:hashtree|fips)\/[^@':]+|nostr-pubsub|nostr-social-graph))@([^']+)'?:$/);
  if (!match || !cohort.packages[match[1]]) continue;
  const expected = cohort.packages[match[1]].url;
  if (match[2] !== expected && !match[2].startsWith(`${expected}(`)) {
    throw new Error(`Stale nested cohort package: ${match[1]}@${match[2]}`);
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
