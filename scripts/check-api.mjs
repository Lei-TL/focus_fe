import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './gen-api.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GENERATED_DIR = 'src/core/api/generated';

await generate();

const status = execFileSync('git', ['status', '--porcelain', '--', GENERATED_DIR], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});

if (status.trim().length > 0) {
  console.error('check:api FAILED — generated API types are out of date (or not committed):');
  console.error(status.trimEnd());
  process.exit(1);
}

console.log(`check:api OK — ${GENERATED_DIR} matches the committed contract.`);
