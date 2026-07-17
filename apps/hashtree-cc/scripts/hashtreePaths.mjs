import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appDir = path.resolve(__dirname, '..');

export function resolveHtreeCommand(...args) {
  return [process.env.HTREE_BIN || 'htree', ...args];
}
