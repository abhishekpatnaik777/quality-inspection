import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateInspection } from './inspection.validation.js';

describe('validateCreateInspection', () => {
  it('requires product_id and user_id', () => {
    const result = validateCreateInspection({});
    assert.equal(result.ok, false);
  });

  it('accepts a valid payload', () => {
    const result = validateCreateInspection({ product_id: 1, user_id: 2 });
    assert.equal(result.ok, true);
  });
});
