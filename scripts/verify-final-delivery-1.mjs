import { readFile } from 'node:fs/promises';
for (const path of ['package.json', 'client/package.json', 'server/package.json']) {
  const data = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
  if (!data.name || !data.scripts) throw new Error(`Unexpected manifest shape: ${path}`);
  console.log(`Valid JSON: ${path}`);
}
const csrf = await readFile(new URL('../server/src/middleware/csrf.js', import.meta.url), 'utf8');
if (!csrf.includes('req.allowMultipartCsrf === true')) throw new Error('Scoped multipart CSRF support is missing.');
console.log('Manifests parsed and multipart gate found. Run npm install, npm test and npm run build next.');
