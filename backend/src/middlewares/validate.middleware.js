import { ApiError } from '../utils/apiError.js';

export function validateBody(validateFn) {
  return (req, _res, next) => {
    const parsed = validateFn(req.body);
    if (!parsed.ok) {
      return next(new ApiError(parsed.statusCode, parsed.error));
    }
    req.validatedBody = parsed.value;
    return next();
  };
}

export function validateParam(validateFn, paramName = 'id') {
  return (req, _res, next) => {
    const parsed = validateFn(req.params[paramName]);
    if (!parsed.ok) {
      return next(new ApiError(parsed.statusCode, parsed.error));
    }
    req.validatedParams = {
      ...req.validatedParams,
      [paramName]: parsed.value,
    };
    return next();
  };
}
