import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError, isPrismaKnownError, mapPrismaError } from './apiError.js';

describe('ApiError', () => {
  it('stores statusCode, message, and extras', () => {
    const err = new ApiError(400, 'bad request', { field: 'email' });
    assert.equal(err.name, 'ApiError');
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'bad request');
    assert.deepEqual(err.extras, { field: 'email' });
  });
});

describe('isPrismaKnownError', () => {
  it('matches prisma error codes', () => {
    assert.equal(isPrismaKnownError({ code: 'P2002' }, 'P2002'), true);
    assert.equal(isPrismaKnownError({ code: 'P2003' }, 'P2002'), false);
    assert.equal(isPrismaKnownError(null, 'P2002'), false);
  });
});

describe('mapPrismaError', () => {
  it('maps P2002 to a 409 ApiError from string mapping', () => {
    assert.throws(
      () => mapPrismaError({ code: 'P2002' }, { P2002: 'email already exists' }),
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, 'email already exists');
        return true;
      }
    );
  });

  it('maps using statusCode and message objects', () => {
    assert.throws(
      () =>
        mapPrismaError(
          { code: 'P2003' },
          { P2003: { statusCode: 400, message: 'invalid reference' } }
        ),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, 'invalid reference');
        return true;
      }
    );
  });

  it('rethrows unknown errors', () => {
    const original = new Error('boom');
    assert.throws(
      () => mapPrismaError(original, { P2002: 'dup' }),
      (err) => err === original
    );
  });
});
