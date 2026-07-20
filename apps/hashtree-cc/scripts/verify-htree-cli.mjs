import { spawnSync } from 'node:child_process';

const command = process.env.HTREE_BIN || 'htree';
const result = spawnSync(command, ['--version'], { encoding: 'utf8' });

if (result.error) {
  throw new Error(`Unable to run ${command}: ${result.error.message}`);
}
if (result.status !== 0) {
  throw new Error(`${command} --version failed with exit code ${result.status ?? 1}`);
}
if (result.stdout.trim() !== 'htree 0.2.114') {
  throw new Error(`Quick Share releases require htree 0.2.114, got ${result.stdout.trim()}`);
}

console.log('Verified public htree 0.2.114 publisher');
