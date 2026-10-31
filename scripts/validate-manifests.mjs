import { readFile } from 'node:fs/promises';
for (const path of ['package.json', 'client/package.json', 'server/package.json']) {
  const file = new URL(`../${path}`, import.meta.url);
  const value = JSON.parse(await readFile(file, 'utf8'));
  if (!value.name || !value.scripts) throw new Error(`${path}: missing name or scripts`);
  console.log(`Valid JSON: ${path}`);
}
