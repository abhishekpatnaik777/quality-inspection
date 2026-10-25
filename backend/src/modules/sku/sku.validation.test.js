import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateSku, SKU_CATEGORIES } from './sku.validation.js';

describe('validateCreateSku', () => {
  it('requires name, category, and model', () => {
    assert.equal(validateCreateSku({}).ok, false);
    assert.equal(validateCreateSku({ name: 'Widget' }).ok, false);
  });

  it('accepts a valid sku', () => {
    const result = validateCreateSku({
      name: 'Widget A',
      category: 'electronics',
      model: 'WA-100',
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.category, 'electronics');
  });

  it('allows known categories', () => {
    for (const category of SKU_CATEGORIES) {
      const result = validateCreateSku({
        name: 'Item',
        category,
        model: `M-${category}`,
      });
      assert.equal(result.ok, true);
    }
  });
});
