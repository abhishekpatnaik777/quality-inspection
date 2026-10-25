import { ApiError } from './apiError.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

function parsePositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new ApiError(400, `${fieldName} must be a positive integer`);
  }
  return num;
}

export function parsePagination(query = {}) {
  const pageRaw = parsePositiveInt(query.page, 'page');
  const limitRaw = parsePositiveInt(query.limit, 'limit');

  const page = pageRaw ?? DEFAULT_PAGE;
  const limit = limitRaw ?? DEFAULT_LIMIT;

  if (page < 1) {
    throw new ApiError(400, 'page must be a positive integer');
  }
  if (limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(400, `limit must be between 1 and ${MAX_LIMIT}`);
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function toPage({ items, page, limit, total }) {
  return {
    items,
    page,
    limit,
    total,
  };
}
