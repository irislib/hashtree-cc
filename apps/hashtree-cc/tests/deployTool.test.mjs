import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inventoryTool } from '../scripts/verify-wrangler-tool.mjs';
import { parseArgs } from '../scripts/deploy-worker-assets.mjs';

test('tool binding detects content, executable mode, and extra-file changes; rejects symlinks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'website-tool-check-'));
  try {
    await mkdir(path.join(root, 'fixture'));
    const file = path.join(root, 'fixture/tool.js');
    await writeFile(file, 'original');
    await chmod(file, 0o644);
    const before = await inventoryTool(root, ['fixture']);
    await writeFile(file, 'changed');
    assert.notEqual((await inventoryTool(root, ['fixture'])).sha256, before.sha256);
    await writeFile(file, 'original');
    await chmod(file, 0o755);
    assert.notEqual((await inventoryTool(root, ['fixture'])).sha256, before.sha256);
    await writeFile(path.join(root, 'fixture/extra.js'), 'extra');
    assert.equal((await inventoryTool(root, ['fixture'])).files, 2);
    await symlink(file, path.join(root, 'fixture/link.js'));
    await assert.rejects(inventoryTool(root, ['fixture']), /symlink/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('deploy rejects a different Wrangler version instead of fetching it', () => {
  const args = ['--script', 'worker.mjs', '--assets', 'dist', '--name', 'fixture', '--compatibility-date', '2026-03-19'];
  assert.equal(parseArgs([...args, '--wrangler-version', '4']).wranglerVersion, '4');
  assert.throws(() => parseArgs([...args, '--wrangler-version', '4.112.0']), /verified local Wrangler/);
});
