import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  resolveHtreeCommand,
} from '../scripts/hashtreePaths.mjs';

const originalEnv = {
  HASHTREE_REPO_ROOT: process.env.HASHTREE_REPO_ROOT,
  HASHTREE_RUST_DIR: process.env.HASHTREE_RUST_DIR,
  HTREE_BIN: process.env.HTREE_BIN,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test.afterEach(() => {
  restoreEnv();
});

test('uses the public htree command by default', () => {
  delete process.env.HASHTREE_REPO_ROOT;
  delete process.env.HASHTREE_RUST_DIR;
  delete process.env.HTREE_BIN;

  assert.deepEqual(resolveHtreeCommand('add', '.'), ['htree', 'add', '.']);
});

test('ignores mutable sibling source and honors an explicit public binary', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hashtree-cc-hashtree-'));
  const rustDir = path.join(tempRoot, 'rust');

  fs.mkdirSync(rustDir, { recursive: true });
  fs.writeFileSync(path.join(rustDir, 'Cargo.toml'), '[package]\nname = "hashtree-cli"\nversion = "0.0.0"\n');
  process.env.HASHTREE_RUST_DIR = rustDir;
  delete process.env.HTREE_BIN;

  assert.deepEqual(resolveHtreeCommand('add', '.'), ['htree', 'add', '.']);
  process.env.HTREE_BIN = '/immutable/htree';
  assert.deepEqual(resolveHtreeCommand('add', '.'), ['/immutable/htree', 'add', '.']);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
