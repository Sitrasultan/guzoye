import test from 'node:test';
import assert from 'node:assert/strict';
import { PERFORMANCE_WEIGHTS } from '../src/services/guidePerformance.js';

test('guide performance weights total 100', () => {
  const total = Object.values(PERFORMANCE_WEIGHTS).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
});