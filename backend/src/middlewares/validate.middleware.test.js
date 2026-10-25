import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '../utils/apiError.js';
import { validateBody, validateParam } from './validate.middleware.js';

describe('validateBody', () => {
  it('attaches validatedBody on success', () => {
    const middleware = validateBody((body) => ({ ok: true, value: { ...body, ok: true } }));
    const req = { body: { name: 'Ada' } };
    let nextCalled = false;
    middleware(req, {}, (err) => {
      assert.equal(err, undefined);
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.deepEqual(req.validatedBody, { name: 'Ada', ok: true });
  });

  it('forwards ApiError when validation fails', () => {
    const middleware = validateBody(() => ({
      ok: false,
      statusCode: 400,
      error: 'name required',
    }));
    const req = { body: {} };
    let error;
    middleware(req, {}, (err) => {
      error = err;
    });
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'name required');
  });
});

describe('validateParam', () => {
  it('merges validatedParams on success', () => {
    const middleware = validateParam((id) => ({ ok: true, value: Number(id) }), 'id');
    const req = { params: { id: '7' }, validatedParams: { other: 1 } };
    middleware(req, {}, () => {});
    assert.deepEqual(req.validatedParams, { other: 1, id: 7 });
  });

  it('forwards ApiError when param validation fails', () => {
    const middleware = validateParam(() => ({
      ok: false,
      statusCode: 400,
      error: 'invalid id',
    }));
    let error;
    middleware({ params: { id: 'x' } }, {}, (err) => {
      error = err;
    });
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'invalid id');
  });
});
