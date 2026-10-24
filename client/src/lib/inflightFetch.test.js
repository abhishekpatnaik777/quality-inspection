import { afterEach, describe, expect, it, vi } from 'vitest';
import { inflightJson, sharedInflight } from './inflightFetch.js';

describe('sharedInflight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reuses one in-flight promise for the same key', async () => {
    let calls = 0;
    const factory = vi.fn(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return calls;
    });

    const [a, b] = await Promise.all([
      sharedInflight('test-key', factory),
      sharedInflight('test-key', factory),
    ]);

    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('allows a new call after the previous one settles', async () => {
    const factory = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    await expect(sharedInflight('settle-key', factory)).resolves.toBe('first');
    await expect(sharedInflight('settle-key', factory)).resolves.toBe('second');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('dedupes inflightJson fetch calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([
      inflightJson('GET /api/demo', '/api/demo'),
      inflightJson('GET /api/demo', '/api/demo'),
    ]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
