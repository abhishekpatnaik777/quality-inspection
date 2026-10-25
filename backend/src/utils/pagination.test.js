import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from './apiError.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT, parsePagination, toPage } from './pagination.js';

describe('parsePagination', () => {
  it('uses defaults when page and limit are omitted', () => {
    assert.deepEqual(parsePagination({}), {
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      skip: 0,
      take: DEFAULT_LIMIT,
    });
  });

  it('computes skip from page and limit', () => {
    assert.deepEqual(parsePagination({ page: '3', limit: '10' }), {
      page: 3,
      limit: 10,
      skip: 20,
      take: 10,
    });
  });

  it('allows the maximum limit', () => {
    assert.equal(parsePagination({ limit: String(MAX_LIMIT) }).limit, MAX_LIMIT);
  });

  it('rejects non-integer page or limit', () => {
    assert.throws(() => parsePagination({ page: '1.5' }), ApiError);
    assert.throws(() => parsePagination({ limit: 'abc' }), ApiError);
  });

  it('rejects page below 1', () => {
    assert.throws(
      () => parsePagination({ page: '0' }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /page/i);
        return true;
      }
    );
  });

  it('rejects limit outside 1..100', () => {
    assert.throws(() => parsePagination({ limit: '0' }), ApiError);
    assert.throws(
      () => parsePagination({ limit: String(MAX_LIMIT + 1) }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /limit/i);
        return true;
      }
    );
  });
});

describe('toPage', () => {
  it('returns the paginated envelope', () => {
    assert.deepEqual(toPage({ items: [{ id: 1 }], page: 2, limit: 10, total: 25 }), {
      items: [{ id: 1 }],
      page: 2,
      limit: 10,
      total: 25,
    });
  });
});
