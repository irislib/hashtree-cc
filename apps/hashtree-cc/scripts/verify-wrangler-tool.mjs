import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

const pin = JSON.parse(await readFile(new URL('./wrangler-tool.json', import.meta.url), 'utf8'));
export const wranglerVersion = pin.version;

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function inventoryTool(root, packages) {
  const rows = [];
  async function visit(relative) {
    const file = path.join(root, relative);
    const info = await lstat(file);
    assert.ok(!info.isSymbolicLink(), `Tool closure contains a symlink: ${relative}`);
    if (info.isDirectory()) {
      for (const name of await readdir(file)) await visit(`${relative}/${name}`);
    } else {
      assert.ok(info.isFile(), `Unsupported tool entry: ${relative}`);
      rows.push({ path: relative, mode: info.mode & 0o7777, sha256: await sha256(file) });
    }
  }
  for (const name of packages) {
    assert.match(name, /^(?:@[a-z0-9-]+\/)?[a-z0-9._-]+$/);
    await visit(name);
  }
  rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { files: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
}

export async function verifiedWranglerCommand(env = process.env) {
  assert.equal(`${process.platform}-${process.arch}`, pin.platform, 'Use the reviewed publisher platform');
  for (const variable of ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'MINIFLARE_WORKERD_PATH']) {
    assert.ok(!env[variable], `Clear ${variable} before validating the tool closure`);
  }
  assert.ok(env.WRANGLER_NODE_MODULES && path.isAbsolute(env.WRANGLER_NODE_MODULES),
    'Set WRANGLER_NODE_MODULES to the verified local tool installation');
  const root = await realpath(env.WRANGLER_NODE_MODULES);
  assert.equal(await sha256(path.join(root, '.package-lock.json')), pin.installedLockSha256,
    'Wrangler installed lock differs from the reviewed closure');
  const packages = [];
  for (const name of await readdir(root)) {
    if (name === '.bin' || name === '.package-lock.json') continue;
    if (name.startsWith('@')) {
      for (const child of await readdir(path.join(root, name))) packages.push(`${name}/${child}`);
    } else packages.push(name);
  }
  assert.deepEqual(packages.sort(), pin.packages.map(p => p.path).sort(), 'Wrangler package set changed');
  const actual = await inventoryTool(root, packages);
  assert.equal(actual.files, pin.files, 'Wrangler tool file set changed');
  assert.equal(actual.sha256, pin.closureSha256, 'Wrangler executable closure changed');
  return [process.execPath, path.join(root, pin.entrypoint)];
}
