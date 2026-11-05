import { describe, expect, it } from 'vitest';
import { calculatePerformance, PERFORMANCE_WEIGHTS } from '../src/services/guidePerformance.js';
describe('guide performance', () => {
  it('defines weights that total 100', () => {
    expect(Object.values(PERFORMANCE_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
  });
  it('returns null for an unknown guide', async () => {
    await expect(calculatePerformance('000000000000000000000000')).resolves.toBeNull();
  });
});
