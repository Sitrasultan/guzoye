import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImage, MAX_IMAGE_BYTES } from '../src/services/imageValidation.js';
import { profileInput } from '../src/middleware/managementValidation.js';
import { guideFilters } from '../src/services/guideFilters.js';
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
test('magic bytes, not filenames or claimed MIME, identify supported formats', () => {
  assert.equal(detectImage(png), 'png');
  assert.equal(detectImage(Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0])), 'jpeg');
  assert.equal(detectImage(Buffer.from('RIFF0000WEBP')), 'webp');
});
test('renaming text to jpg does not make it an image', () => {
  assert.throws(() => detectImage(Buffer.from('not-an-image.jpg; text/plain')), error => error.status === 400);
  assert.throws(() => detectImage(Buffer.from('<svg><script>alert(1)</script></svg>')), error => error.status === 400);
});
test('oversized content is rejected before decoding', () => {
  const buffer = Buffer.alloc(MAX_IMAGE_BYTES + 1); png.copy(buffer);
  assert.throws(() => detectImage(buffer), error => error.status === 413);
});
test('guide filter validation accepts combined canonical filters', () => {
  const result = guideFilters({ destination: '00000000000000000000012d', language: 'English', minRating: '4.5', q: 'Hana', sort: 'experience', page: '2', limit: '6' });
  assert.equal(result.minRating, 4.5); assert.equal(result.page, 2); assert.equal(result.sort, 'experience');
});
test('guide filters reject invalid, repeated and unsupported values', () => {
  for (const query of [{ destination: 'Lalibela' }, { minRating: 'NaN' }, { minRating: '6' }, { sort: 'random' }, { q: ['one', 'two'] }, { limit: '51' }, { role: 'admin' }]) assert.throws(() => guideFilters(query));
});

test('generic profile PATCH cannot bypass image upload ownership', () => { assert.throws(() => profileInput({ image: 'https://example.com/a.jpg' })); });
