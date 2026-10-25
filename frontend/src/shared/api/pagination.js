import { fetchJson } from './inflightFetch.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function pageCount(total, limit) {
  if (!limit || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

export function withPaginationParams(url, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}page=${page}&limit=${limit}`;
}

/** Walk pages at max limit until every item is loaded. */
export async function fetchAllPages(baseUrl, { errorMessage = 'Request failed' } = {}) {
  const items = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total) {
    const url = withPaginationParams(baseUrl, { page, limit: MAX_PAGE_SIZE });
    const data = await fetchJson(url, { errorMessage });
    const batch = Array.isArray(data?.items) ? data.items : [];
    total = Number(data?.total ?? batch.length);
    items.push(...batch);
    if (batch.length === 0) break;
    page += 1;
  }

  return items;
}
