import { describe, expect, it } from 'vitest';
import { STATUSES, isValidStatus } from './statuses.js';

describe('isValidStatus', () => {
  it('accepts known statuses', () => {
    for (const status of STATUSES) {
      expect(isValidStatus(status)).toBe(true);
    }
  });

  it('rejects unknown statuses', () => {
    expect(isValidStatus('unknown')).toBe(false);
    expect(isValidStatus('')).toBe(false);
  });
});
