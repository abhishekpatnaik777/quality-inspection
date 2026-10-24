import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateItem,
  validateUpdateItem,
  validateItemId,
  ALLOWED_STATUSES,
  createItemSchema,
  updateItemSchema,
} from './items.js';

describe('createItemSchema', () => {
  it('is a Zod schema', () => {
    assert.equal(typeof createItemSchema.safeParse, 'function');
  });
});

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
    assert.match(result.error, /Invalid option|Invalid enum|pending/i);
  });

  it('allows known statuses', () => {
    for (const status of ALLOWED_STATUSES) {
      const result = validateCreateItem({ name: 'A', status });
      assert.equal(result.ok, true);
      assert.equal(result.value.status, status);
    }
  });

  it('rejects names longer than 255 characters', () => {
    const result = validateCreateItem({ name: 'x'.repeat(256) });
    assert.equal(result.ok, false);
  });
});

describe('updateItemSchema / validateUpdateItem', () => {
  it('is a Zod schema', () => {
    assert.equal(typeof updateItemSchema.safeParse, 'function');
  });

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

  it('rejects empty body', () => {
    assert.equal(validateUpdateItem({}).ok, false);
  });
});

describe('validateItemId', () => {
  it('accepts positive integer ids', () => {
    assert.deepEqual(validateItemId('12'), { ok: true, value: 12 });
  });

  it('rejects non-positive or non-integer ids', () => {
    assert.equal(validateItemId('0').ok, false);
    assert.equal(validateItemId('-1').ok, false);
    assert.equal(validateItemId('abc').ok, false);
  });
});
