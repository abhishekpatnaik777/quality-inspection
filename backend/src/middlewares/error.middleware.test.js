import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../utils/apiError.js';
import { errorMiddleware } from './error.middleware.js';

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('errorMiddleware', () => {
  it('returns ApiError status and message', () => {
    const res = mockRes();
    errorMiddleware(new ApiError(404, 'not found', { code: 'missing' }), {}, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'not found', code: 'missing' });
  });

  it('returns 500 for unexpected errors', () => {
    const res = mockRes();
    const originalError = console.error;
    console.error = () => {};
    try {
      errorMiddleware(new Error('boom'), {}, res, () => {});
    } finally {
      console.error = originalError;
    }
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'Internal server error' });
  });
});
