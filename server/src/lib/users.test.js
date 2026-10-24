import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateUser, validateUpdateUser, validateUserId, USER_STATUSES } from './users.js';

describe('validateCreateUser', () => {
  it('requires name, email, and role', () => {
    assert.equal(validateCreateUser({}).ok, false);
    assert.equal(validateCreateUser({ name: 'Ada', email: 'ada@example.com' }).ok, false);
  });

  it('requires supervisor_id for quality engineers', () => {
    const missing = validateCreateUser({
      name: 'QE',
      email: 'qe@example.com',
      role: 'quality_engineer',
    });
    assert.equal(missing.ok, false);
    assert.match(missing.error, /supervisor_id/i);

    const ok = validateCreateUser({
      name: 'QE',
      email: 'qe@example.com',
      role: 'quality_engineer',
      supervisor_id: 1,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.value.supervisor_id, 1);
  });

  it('rejects supervisor_id for supervisors', () => {
    const result = validateCreateUser({
      name: 'Sup',
      email: 'sup@example.com',
      role: 'supervisor',
      supervisor_id: 1,
    });
    assert.equal(result.ok, false);
  });

  it('accepts a supervisor without supervisor_id', () => {
    const result = validateCreateUser({
      name: 'Sup',
      email: 'sup@example.com',
      role: 'supervisor',
    });
    assert.equal(result.ok, true);
  });
});

describe('validateUpdateUser', () => {
  it('allows partial updates', () => {
    const result = validateUpdateUser({ status: 'inactive' });
    assert.equal(result.ok, true);
    assert.equal(result.value.status, 'inactive');
  });

  it('rejects empty body', () => {
    assert.equal(validateUpdateUser({}).ok, false);
  });

  it('allows known statuses', () => {
    for (const status of USER_STATUSES) {
      assert.equal(validateUpdateUser({ status }).ok, true);
    }
  });
});

describe('validateUserId', () => {
  it('accepts positive integers', () => {
    assert.deepEqual(validateUserId('3'), { ok: true, value: 3 });
  });

  it('rejects invalid ids', () => {
    assert.equal(validateUserId('0').ok, false);
    assert.equal(validateUserId('abc').ok, false);
  });
});
