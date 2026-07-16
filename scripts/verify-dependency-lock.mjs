import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('apps/hashtree-cc/package.json', root), 'utf8'));
const lockfile = await readFile(new URL('pnpm-lock.yaml', root), 'utf8');
const workspace = await readFile(new URL('pnpm-workspace.yaml', root), 'utf8');

const fipsRoot = 'https://github.com/mmalmi/fips-ts/releases/download/runtime-v0.0.25';
const tcpRoot = 'https://github.com/mmalmi/fips-tcp/releases/download/v0.2.0';
const hashtreeRoot =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.4.2';
const hashtreeRuntime043 =
  'https://github.com/mmalmi/hashtree/releases/download/hashtree-ts-runtime-v0.4.3';
const kitRoot = 'https://github.com/mmalmi/iris-kit/releases/download/runtime-v0.2.2';

const releases = {
  '@fips/browser': {
    url: `${fipsRoot}/fips-browser-0.0.7.tgz`,
    integrity: 'sha512-KqCKq1tHrrrfZqmiSlu2EN7AZQbRA5GX9YWSPUPmGYNi7JmpsNW5Qjxoo99KTALt4RfgMG8ncBiLlSOUVNykTA==',
  },
  '@fips/core': {
    url: `${fipsRoot}/fips-core-0.0.25.tgz`,
    integrity: 'sha512-xlD87cnd5DrzqBxl5s1l1YZxv4Xo1OumG+Pf/0X4U2TyKCmh33KP3L065djpiWlVca1uRhGppELaYT1mIZWNnw==',
  },
  '@fips/tcp': {
    url: `${tcpRoot}/fips-tcp-0.2.0.tgz`,
    integrity: 'sha512-KCJmltpx4cH76Sp+GOKJvYzQpwUTUtmyBA5bgcfS36ty8AxSgBQZxLdBwM59IER+B/rZpjRYFtqE6MPePL0o+w==',
  },
  '@fips/transport-webrtc': {
    url: `${fipsRoot}/fips-transport-webrtc-0.0.41.tgz`,
    integrity: 'sha512-T3l48GfWLX5FWXhjHjuFvuIp74SyQUwFkux7U6uhHaaOsCOU772H6N+FeRJJSl3NnjKoWxRTBAsx+ftr2Qmj2w==',
  },
  '@hashtree/collection': {
    url: `${hashtreeRoot}/hashtree-collection-0.2.7.tgz`,
    integrity: 'sha512-+FwdGHZbwZZPwgyLnHExngCart3TL7uQ+QteJlro8HS3CPHh+iw6qorAQsLU78x0K1+FJNTmfEaM+SWtzR/b3Q==',
  },
  '@hashtree/core': {
    url: `${hashtreeRoot}/hashtree-core-0.2.1.tgz`,
    integrity: 'sha512-kkZKx/mNqImMy1DnWXRgv2LHaf5HbZg8sIpHV6/wLZKl3cQkmSY9xtjCZSTlUXeXIgOmxDzqDGa2GNf5Rg7b/A==',
  },
  '@hashtree/dexie': {
    url: `${hashtreeRoot}/hashtree-dexie-0.1.7.tgz`,
    integrity: 'sha512-9wI7r3Fwx0ATBt42IUVE+AIqSdGbevS1iesSqbwz0gDia/yxJYH6cMXNvnPV6BClwdewJBUVy+r12ZfqXkyI1A==',
  },
  '@hashtree/fips-transport': {
    url: `${hashtreeRuntime043}/hashtree-fips-transport-0.4.3.tgz`,
    integrity: 'sha512-HZZ1CEimNUXoBm75Jk2weKT6FF2Rgja9NO8dQQtCzHHMhJ4ZRODRzOR9zqOsTw5eY2q6rDm4FEdikKltEZ7ctg==',
  },
  '@hashtree/index': {
    url: `${hashtreeRoot}/hashtree-index-0.1.11.tgz`,
    integrity: 'sha512-Zc6XHOYnJ0d8tOHvCp4ZXFJizh2MJj3PyYqGL2+sxti+HAFrkonGrz6cotXKUsr9A8Z4FE2XtnwfwTultdk6fw==',
  },
  '@hashtree/mesh': {
    url: `${hashtreeRoot}/hashtree-mesh-0.1.5.tgz`,
    integrity: 'sha512-sgb9zzUt82nGC+sTCH/yAEhMibx1gqq02sqdQDuuaORRpc8RluBMFUKval6kqM9vnghgJ2eIN4if9XI+0YAXSw==',
  },
  '@hashtree/nostr': {
    url: `${hashtreeRoot}/hashtree-nostr-0.1.17.tgz`,
    integrity: 'sha512-WbfVz9EXOeRm+GnkxSa1fveZiMA4AySs0ly2JB7wxd78FbbGl7YpL/7Bvh0DKRxVi7ZY41kjHWaDrSSSQ2pa8A==',
  },
  '@hashtree/worker': {
    url: `${hashtreeRuntime043}/hashtree-worker-0.3.2.tgz`,
    integrity: 'sha512-qKh9A1xlXbxFwZss+XVvIzYGR95A9+xwZYKHu2Xl/obOiR5pIIz5iHpjB/KUTpc/H1uSeIyJplFKmfpLDAMZ3w==',
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
