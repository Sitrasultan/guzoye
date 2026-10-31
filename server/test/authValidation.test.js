import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCredentials } from '../src/middleware/authValidation.js';
const valid = { name: ' Hana ', email: ' HANA@example.com ', password: 'Secret12', role: 'guide' };
test('registration normalizes identity and accepts 8-character password', () => {
  assert.deepEqual(parseCredentials(valid, true), { ...valid, name: 'Hana', email: 'hana@example.com' });
});
test('name, email, and password return clear field errors', () => {
  assert.throws(() => parseCredentials({ name: ' ', email: 'bad', password: 'short' }, true), error => error.status === 400 && Boolean(error.errors.name && error.errors.email && error.errors.password));
});
test('public registration rejects admin and arbitrary roles', () => {
  for (const role of ['admin', 'owner', null, {}, ['guide']]) assert.throws(() => parseCredentials({ ...valid, role }, true), error => error.status === 400 && Boolean(error.errors.role));
});
test('password byte limit prevents bcrypt truncation', () => {
  assert.throws(() => parseCredentials({ ...valid, password: 'a'.repeat(73) }, true));
  assert.throws(() => parseCredentials({ ...valid, password: '界'.repeat(25) }, true));
});
test('unknown fields are not assigned to the User model', () => {
  const result = parseCredentials({ ...valid, tokenVersion: 0, status: 'approved', isAdmin: true }, true);
  assert.equal(result.status, undefined); assert.equal(result.tokenVersion, undefined); assert.equal(result.isAdmin, undefined);
});
