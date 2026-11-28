import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'apps/hashtree-cc/package.json', 'scripts/runtime-pins.json', 'scripts/verify-dependency-lock.mjs'];

function check(change) {
  const fixture = mkdtempSync(path.join(tmpdir(), 'hashtree-runtime-pins-'));
  try {
    for (const file of files) {
      mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      writeFileSync(path.join(fixture, file), readFileSync(path.join(root, file)));
    }
    change?.(fixture);
    return spawnSync(process.execPath, [path.join(fixture, 'scripts/verify-dependency-lock.mjs')],
      { encoding: 'utf8', timeout: 5000 });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('accepts the complete corrected cohort', () => {
  const result = check();
  assert.equal(result.status, 0, result.stderr);
});

test('rejects an old nested package even with the accepted direct package present', () => {
  const result = check(fixture => {
    const file = path.join(fixture, 'pnpm-lock.yaml');
    writeFileSync(file, readFileSync(file, 'utf8') + "\n  '@hashtree/core@https://example.invalid/hashtree-core-0.4.0.tgz': {}\n");
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Stale nested cohort package/);
});

test('rejects an overriding stale child selector', () => {
  const result = check(fixture => {
    const file = path.join(fixture, 'package.json');
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    pkg.pnpm.overrides['@hashtree/worker>@hashtree/core'] = '0.4.0';
    writeFileSync(file, JSON.stringify(pkg));
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Stale cohort override/);
});

test('rejects a changed accepted archive checksum', () => {
  const result = check(fixture => {
    const pins = JSON.parse(readFileSync(path.join(fixture, 'scripts/runtime-pins.json'), 'utf8'));
    const file = path.join(fixture, 'pnpm-lock.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace(pins.packages['@fips/core'].integrity, 'sha512-wrong'));
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing its verified release integrity/);
});
