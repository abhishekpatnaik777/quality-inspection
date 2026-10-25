import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateInspection, validateInspectionId } from './inspection.validation.js';

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

describe('validateInspectionId', () => {
  it('accepts positive integers', () => {
    const result = validateInspectionId('12');
    assert.equal(result.ok, true);
    assert.equal(result.value, 12);
  });

  it('rejects zero and non-numeric values', () => {
    assert.equal(validateInspectionId('0').ok, false);
    assert.equal(validateInspectionId('abc').ok, false);
  });
});
