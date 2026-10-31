import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const guide = await readFile(new URL('../server/src/routes/guideManagementRoutes.js', import.meta.url), 'utf8');
const admin = await readFile(new URL('../server/src/routes/adminRoutes.js', import.meta.url), 'utf8');
assert.match(guide, /router.use\(requireAuth, requireRoles\('guide'\)\)/);
assert.match(admin, /router.use\(requireAuth, requireRoles\('admin'\)\)/);
for (const [name, source] of [['guide', guide], ['admin', admin]]) {
  for (const line of source.split('\n').filter(value => /router\.(post|patch|delete)\(/.test(value))) {
    assert.ok(line.includes('requireCsrf'), `${name} write route lacks CSRF: ${line}`);
  }
}
console.log('Source invariants passed: guide/admin role middleware and CSRF on every new write. This does not replace HTTP tests.');
