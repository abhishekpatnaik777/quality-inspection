import { ApiError } from '../utils/apiError.js';

export function errorMiddleware(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, ...err.extras });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
