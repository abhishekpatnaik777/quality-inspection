import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBatchNumber, validateGenerateProducts } from './products.js';

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
});

describe('buildBatchNumber', () => {
  it('includes sku and unit ids', () => {
    const value = buildBatchNumber({ skuId: 3, manufacturingUnitId: 9 });
    assert.match(value, /^B-3-9-/);
  });
});
