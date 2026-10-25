import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateUser } from './user.validation.js';

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
