import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createNativeReleaseCommand, parseNativeReleaseOutput } from '@iris/release-tools';
import './verify-htree-cli.mjs';
import { appDir, resolveHtreeCommand } from './hashtreePaths.mjs';

const distDir = path.join(appDir, 'dist');
const treeName = 'hashtree-cc-site';
const [command, ...args] = createNativeReleaseCommand({ distDir, treeName, resolveHtreeCommand });

const result = spawnSync(command, args, {
  cwd: distDir,
  encoding: 'utf8',
  stdio: 'pipe',
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const publish = parseNativeReleaseOutput(`${result.stdout}\n${result.stderr}`, treeName);
console.log(`Portable hashtree.cc immutable URL: htree://${publish.nhash}/index.html`);
console.log(`Portable hashtree.cc mutable URL: htree://${publish.publishedRef}`);
console.log(`Portable hashtree.cc owner URL: htree://${publish.publishedRef}`);
