import test from 'node:test';
import assert from 'node:assert/strict';
import { profileInput, tourInput, departureInput, imageUrl, filters } from '../src/middleware/managementValidation.js';
const id = '000000000000000000000191';
const future = new Date(Date.now() + 86400000 * 14).toISOString();
const tour = { title: 'A locally led journey', destination: id, description: 'A thoughtful local tour with meaningful conversations.', price: 19.99, duration: 1, difficulty: 'Easy', capacity: 8, itinerary: [{ title: 'Explore the city', description: 'Walk with your local guide.' }], images: ['https://example.com/image.jpg'], included: ['Guide'], excluded: ['Flights'], departures: [{ date: future, capacity: 8 }] };
test('profile edits are allowlisted and normalize lists', () => {
  assert.deepEqual(profileInput({ languages: [' English ', 'English'], regionsCovered: ['Amhara'], yearsExperience: 5 }), { languages: ['English'], regionsCovered: ['Amhara'], yearsExperience: 5 });
  assert.throws(() => profileInput({ status: 'approved' }));
});
test('image URLs require public HTTPS hostnames', () => {
  assert.equal(imageUrl('https://example.com/image.jpg'), 'https://example.com/image.jpg');
  for (const value of ['javascript:alert(1)', 'http://example.com/image.jpg', 'https://localhost/image', 'https://127.0.0.1/a', 'https://user:pass@example.com/a', 'https://[::1]/a']) assert.throws(() => imageUrl(value));
});
test('tour input strips itinerary day numbering and calculates initial spots', () => {
  const result = tourInput(tour);
  assert.equal(result.itinerary[0].day, 1); assert.equal(result.departures[0].spotsLeft, 8);
  assert.throws(() => tourInput({ ...tour, guide: id }));
  assert.throws(() => tourInput({ ...tour, price: 10.123 }));
});
test('partial edits cannot replace departures or ownership', () => {
  assert.deepEqual(tourInput({ title: 'A new title' }, true), { title: 'A new title' });
  for (const body of [{ departures: [] }, { guide: id }, { archived: true }]) assert.throws(() => tourInput(body, true));
});
test('departure dates must be future, timezone-qualified, and real', () => {
  assert.equal(departureInput({ date: future, capacity: 2 }).spotsLeft, 2);
  for (const date of ['2020-01-01T00:00:00Z', '2099-02-31T00:00:00Z', '2099-01-01T00:00:00']) assert.throws(() => departureInput({ date, capacity: 2 }));
});
test('list parameters reject unexpected and repeated values', () => {
  assert.deepEqual(filters({ page: '2', limit: '5' }), { page: 2, limit: 5 });
  assert.throws(() => filters({ status: ['pending', 'approved'] }, ['status']));
  assert.throws(() => filters({ unknown: 'yes' }));
});
