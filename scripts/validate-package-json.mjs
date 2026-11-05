import { readFile } from 'node:fs/promises';
for (const path of ['client/package.json', 'server/package.json']) {
  const parsed = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url)));
  console.log(`${path}: valid JSON (${Object.keys(parsed.dependencies || {}).length} dependencies)`);
}
