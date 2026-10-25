import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateUserRole,
  validateUpdateUserRole,
  validateUserRoleId,
  USER_ROLES,
} from './userRole.validation.js';

describe('validateCreateUserRole', () => {
  it('requires user_id and role', () => {
    assert.equal(validateCreateUserRole({}).ok, false);
    assert.equal(validateCreateUserRole({ user_id: 1 }).ok, false);
  });

  it('accepts supervisor and quality_engineer only', () => {
    for (const role of USER_ROLES) {
      const result = validateCreateUserRole({ user_id: 1, role });
      assert.equal(result.ok, true);
      assert.equal(result.value.role, role);
    }
    assert.equal(validateCreateUserRole({ user_id: 1, role: 'admin' }).ok, false);
  });
});

describe('validateUpdateUserRole', () => {
  it('allows status-only updates', () => {
    const result = validateUpdateUserRole({ status: 'inactive' });
    assert.equal(result.ok, true);
    assert.equal(result.value.status, 'inactive');
  });

  it('rejects empty body', () => {
    assert.equal(validateUpdateUserRole({}).ok, false);
  });
});

describe('validateUserRoleId', () => {
  it('accepts positive integers', () => {
    assert.deepEqual(validateUserRoleId('9'), { ok: true, value: 9 });
  });
});
