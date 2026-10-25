import { ApiError } from '../utils/apiError.js';
import { findUserWithRoles } from '../modules/user/user.repository.js';

/**
 * Ensures `req.body.user_id` is an active quality engineer.
 * Attaches the user (with roles) as `req.qualityEngineer` on success.
 */
export function requireQualityEngineer(userIdField = 'user_id') {
  return async (req, _res, next) => {
    const userId = Number(req.body?.[userIdField]);
    if (!Number.isInteger(userId) || userId < 1) {
      return next(new ApiError(400, `${userIdField} must be a positive integer`));
    }

    try {
      const user = await findUserWithRoles(userId);

      if (!user) {
        return next(new ApiError(404, 'User not found'));
      }

      const isQualityEngineer = user.roles.some(
        (role) => role.role === 'quality_engineer' && role.status === 'active'
      );

      if (!isQualityEngineer) {
        return next(new ApiError(403, 'Only quality engineers can perform this action'));
      }

      req.qualityEngineer = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
