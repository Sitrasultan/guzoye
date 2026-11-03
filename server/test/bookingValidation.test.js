import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingInput, bookingFilters, statusInput, transitionAllowed, calculateTotal } from '../src/middleware/bookingValidation.js';
const id = '000000000000000000000191';
test('booking input allowlists fields and requires integer guests', () => {
  assert.deepEqual(bookingInput({ tour: id, departureId: id, guideId: id, guests: 2, totalPrice: 0, status: 'confirmed' }), { tour: id, departureId: id, guideId: id, guests: 2 });
  for (const guests of [0, -1, 1.5, '2', null, 1001]) assert.throws(() => bookingInput({ tour: id, departureId: id, guideId: id, guests }));
});
test('malformed resource identifiers return 400', () => {
  assert.throws(() => bookingInput({ tour: '$ne', departureId: id, guideId: id, guests: 1 }), error => error.status === 400);
});
test('booking filters reject unknown, invalid, and repeated fields', () => {
  assert.equal(bookingFilters({ status: 'pending', page: '1' }).status, 'pending');
  for (const query of [{ status: 'unknown' }, { owner: id }, { status: ['pending', 'confirmed'] }, { page: '-1' }]) assert.throws(() => bookingFilters(query));
});
test('only documented guide transitions are valid', () => {
  const valid = new Set(['pending:confirmed', 'pending:declined', 'confirmed:completed']);
  for (const from of ['pending', 'confirmed', 'declined', 'cancelled', 'completed']) {
    for (const to of ['pending', 'confirmed', 'declined', 'cancelled', 'completed']) assert.equal(transitionAllowed(from, to), valid.has(`${from}:${to}`));
  }
  assert.throws(() => statusInput({ status: 'pending' }));
});
test('server total uses integer cents', () => {
  assert.equal(calculateTotal(19.99, 3), 59.97);
  assert.equal(calculateTotal(240, 2), 480);
  assert.throws(() => calculateTotal(Infinity, 1));
});