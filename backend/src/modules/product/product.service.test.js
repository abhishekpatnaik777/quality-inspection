import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBatchNumber } from './product.service.js';

describe('buildBatchNumber', () => {
  it('includes sku and unit ids', () => {
    const value = buildBatchNumber({ skuId: 3, manufacturingUnitId: 9 });
    assert.match(value, /^B-3-9-/);
  });
});
