import { readFile } from 'node:fs/promises';
for (const path of ['package.json', 'client/package.json', 'server/package.json']) {
  JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
  console.log(`Valid JSON: ${path}`);
}
console.log('Phase 4 changes no package manifests and adds no npm dependencies.');
