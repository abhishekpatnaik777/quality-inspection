import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerateProducts } from './product.validation.js';

describe('validateGenerateProducts', () => {
  it('requires sku_id and manufacturing_unit_id', () => {
    assert.equal(validateGenerateProducts({}).ok, false);
  });

  it('accepts valid generate payload', () => {
    const result = validateGenerateProducts({
      sku_id: 1,
      manufacturing_unit_id: 2,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.sku_id, 1);
    assert.equal(result.value.manufacturing_unit_id, 2);
  });

  it('defaults omitted manufacturing_date to a Date', () => {
    const result = validateGenerateProducts({
      sku_id: 1,
      manufacturing_unit_id: 2,
    });
    assert.equal(result.ok, true);
    assert.ok(result.value.manufacturing_date instanceof Date);
  });

  it('rejects an invalid manufacturing_date', () => {
    const result = validateGenerateProducts({
      sku_id: 1,
      manufacturing_unit_id: 2,
      manufacturing_date: 'not-a-date',
    });
    assert.equal(result.ok, false);
  });
});
