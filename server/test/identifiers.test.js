import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSlug, validateSlug, identifierFilter } from '../src/services/identifiers.js';

test('normalizes titles into slugs', () => {
  assert.equal(normalizeSlug('Danakil Depression & Erta Ale'), 'danakil-depression-erta-ale');
});

test('rejects reserved or malformed slugs', () => {
  assert.throws(() => validateSlug('admin'));
  assert.throws(() => validateSlug('Bad Slug'));
  assert.equal(validateSlug('danakil-depression'), 'danakil-depression');
});

test('resolves slug, code, and legacy ObjectId filters', () => {
  assert.deepEqual(identifierFilter(null, 'danakil-depression'), { slug: 'danakil-depression' });
  assert.deepEqual(identifierFilter(null, 'TOUR-0001'), { code: 'TOUR-0001' });
  assert.equal(
    identifierFilter(null, '507f1f77bcf86cd799439011')._id.toString(),
    '507f1f77bcf86cd799439011'
  );
});