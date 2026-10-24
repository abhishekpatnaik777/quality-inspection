import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateItem, validateUpdateItem, ALLOWED_STATUSES } from './items.js';

describe('validateCreateItem', () => {
  it('requires a non-empty name', () => {
    assert.equal(validateCreateItem({}).ok, false);
    assert.equal(validateCreateItem({ name: '   ' }).ok, false);
    assert.equal(validateCreateItem({ name: 123 }).ok, false);
  });

  it('accepts a valid item and trims the name', () => {
    const result = validateCreateItem({ name: '  Widget  ', notes: 'ok' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, {
      name: 'Widget',
      status: 'pending',
      notes: 'ok',
    });
  });

  it('rejects invalid status values', () => {
    const result = validateCreateItem({ name: 'A', status: 'unknown' });
    assert.equal(result.ok, false);
    assert.match(result.error, /status must be one of/);
  });

  it('allows known statuses', () => {
    for (const status of ALLOWED_STATUSES) {
      const result = validateCreateItem({ name: 'A', status });
      assert.equal(result.ok, true);
      assert.equal(result.value.status, status);
    }
  });
});

describe('validateUpdateItem', () => {
  it('allows partial updates', () => {
    const result = validateUpdateItem({ status: 'passed' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, {
      name: null,
      status: 'passed',
      notes: null,
    });
  });

  it('rejects empty name when provided', () => {
    assert.equal(validateUpdateItem({ name: '' }).ok, false);
  });

  it('rejects invalid status when provided', () => {
    assert.equal(validateUpdateItem({ status: 'nope' }).ok, false);
  });
});
