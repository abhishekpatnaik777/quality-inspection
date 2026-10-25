import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllPages, pageCount, withPaginationParams } from './pagination.js';

describe('pageCount', () => {
  it('rounds up and defaults empty totals to one page', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
  });
});

describe('withPaginationParams', () => {
  it('appends page and limit to urls with and without query strings', () => {
    expect(withPaginationParams('/api/skus', { page: 2, limit: 10 })).toBe(
      '/api/skus?page=2&limit=10'
    );
    expect(withPaginationParams('/api/users?q=ada', { page: 1, limit: 20 })).toBe(
      '/api/users?q=ada&page=1&limit=20'
    );
  });
});

describe('fetchAllPages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('walks pages until every item is collected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 1 }, { id: 2 }], page: 1, limit: 100, total: 3 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 3 }], page: 2, limit: 100, total: 3 }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllPages('/api/skus')).resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
