export class ApiError extends Error {
  constructor(statusCode, message, extras = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.extras = extras;
  }
}

export function isPrismaKnownError(err, code) {
  return Boolean(err && err.code === code);
}

export function mapPrismaError(err, mapping) {
  for (const [code, value] of Object.entries(mapping)) {
    if (isPrismaKnownError(err, code)) {
      if (typeof value === 'string') {
        throw new ApiError(code === 'P2002' ? 409 : code === 'P2025' ? 404 : 400, value);
      }
      throw new ApiError(value.statusCode, value.message);
    }
  }
  throw err;
}
