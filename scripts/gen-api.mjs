import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

// Focus_Be commit whose committed contract (contracts/openapi.json) these types
// were generated from and verified against. Update this when the BE contract
// moves and the generated file is refreshed.
const BE_CONTRACT_COMMIT = '9b6744e';

const DEFAULT_SPEC = path.join(REPO_ROOT, '..', 'Focus_Be', 'contracts', 'openapi.json');
const OUTPUT_FILE = path.join(REPO_ROOT, 'src', 'core', 'api', 'generated', 'schema.d.ts');

const HEADER = `/**
 * GENERATED — không sửa tay; chạy pnpm gen:api
 *
 * Sinh từ OpenAPI của Focus_Be (contracts/openapi.json) bằng openapi-typescript.
 * BE contract commit: ${BE_CONTRACT_COMMIT}
 */

`;

export async function generate() {
  const specPath = path.resolve(process.env.OPENAPI_SPEC ?? DEFAULT_SPEC);
  const ast = await openapiTS(pathToFileURL(specPath), { alphabetize: true });
  const body = astToString(ast);
  const contents = (HEADER + body).replace(/\r\n/g, '\n');
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, contents.endsWith('\n') ? contents : `${contents}\n`, 'utf8');
  return { specPath, outputFile: OUTPUT_FILE };
}

const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const { specPath, outputFile } = await generate();
  console.log(
    `gen:api wrote ${path.relative(REPO_ROOT, outputFile)} from ${path.relative(REPO_ROOT, specPath)}`
  );
}
