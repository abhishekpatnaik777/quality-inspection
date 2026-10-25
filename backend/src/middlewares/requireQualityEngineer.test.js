import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ApiError } from '../utils/apiError.js';

const findUserWithRoles = mock.fn();

mock.module('../modules/user/user.repository.js', {
  namedExports: {
    findUserWithRoles: (...args) => findUserWithRoles(...args),
  },
});

const { requireQualityEngineer } = await import('./requireQualityEngineer.js');

describe('requireQualityEngineer', () => {
  it('rejects missing or invalid user ids', async () => {
    const middleware = requireQualityEngineer('user_id');
    const err = await new Promise((resolve) => {
      middleware({ body: {} }, {}, resolve);
    });
    assert.ok(err instanceof ApiError);
    assert.equal(err.statusCode, 400);
  });

  it('returns 404 when the user is missing', async () => {
    findUserWithRoles.mock.resetCalls();
    findUserWithRoles.mock.mockImplementation(async () => null);
    const middleware = requireQualityEngineer('user_id');
    const err = await new Promise((resolve) => {
      middleware({ body: { user_id: 9 } }, {}, resolve);
    });
    assert.equal(err.statusCode, 404);
  });

  it('returns 403 when the user is not an active quality engineer', async () => {
    findUserWithRoles.mock.mockImplementation(async () => ({
      id: 2,
      roles: [{ role: 'supervisor', status: 'active' }],
    }));
    const middleware = requireQualityEngineer('verified_by');
    const err = await new Promise((resolve) => {
      middleware({ body: { verified_by: 2 } }, {}, resolve);
    });
    assert.equal(err.statusCode, 403);
    assert.match(err.message, /quality engineers/i);
  });

  it('attaches qualityEngineer on success', async () => {
    const user = {
      id: 3,
      roles: [{ role: 'quality_engineer', status: 'active' }],
    };
    findUserWithRoles.mock.mockImplementation(async () => user);
    const middleware = requireQualityEngineer('created_by');
    const req = { body: { created_by: 3 } };
    await new Promise((resolve, reject) => {
      middleware(req, {}, (err) => (err ? reject(err) : resolve()));
    });
    assert.equal(req.qualityEngineer, user);
  });
});
