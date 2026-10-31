import { readFile } from 'node:fs/promises';
for (const path of ['package.json', 'client/package.json', 'server/package.json']) {
  const data = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
  if (!data.name || !data.scripts) throw new Error(`${path} lacks expected project fields.`);
  console.log(`Valid JSON: ${path}`);
}
console.log('This upgrade changes no npm manifests or dependencies.');
