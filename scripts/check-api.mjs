import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './gen-api.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GENERATED_DIR = 'src/core/api/generated';
const GENERATED_FILE = `${GENERATED_DIR}/schema.d.ts`;

function git(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

await generate();

// An untracked generated file must fail: `git diff` alone would stay silent and
// report a false green.
let isTracked = true;
try {
  git(['ls-files', '--error-unmatch', '--', GENERATED_FILE]);
} catch {
  isTracked = false;
}

if (!isTracked) {
  console.error(`check:api FAILED — ${GENERATED_FILE} is not committed.`);
  console.error('Run gen:api and commit the generated file.');
  process.exit(1);
}

// Compare against HEAD by content (git normalizes line endings), so this does
// not false-positive on CRLF/LF differences the way `git status` can.
try {
  git(['diff', '--exit-code', 'HEAD', '--', GENERATED_DIR]);
} catch (error) {
  console.error(`check:api FAILED — ${GENERATED_DIR} is out of date vs HEAD:`);
  console.error(String(error.stdout ?? '').trimEnd());
  process.exit(1);
}

console.log(`check:api OK — ${GENERATED_DIR} matches the committed contract.`);
