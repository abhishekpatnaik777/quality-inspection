const inflight = new Map();

/**
 * Share one in-flight promise for a key so React Strict Mode's double mount
 * in development does not hit the network twice.
 */
export function sharedInflight(key, factory) {
  if (!inflight.has(key)) {
    const request = Promise.resolve()
      .then(factory)
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, request);
  }
  return inflight.get(key);
}

export async function fetchJson(url, { errorMessage = 'Request failed', ...init } = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || errorMessage);
  }
  return res.json();
}

export function inflightJson(key, url, options) {
  return sharedInflight(key, () => fetchJson(url, options));
}
