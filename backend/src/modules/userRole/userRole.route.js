import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import {
  validateCreateUserRole,
  validateUpdateUserRole,
  validateUserRoleId,
} from './userRole.validation.js';
import * as userRoleController from './userRole.controller.js';

const router = Router();

router.get('/', catchAsync(userRoleController.listUserRoles));
router.get('/:id', validateParam(validateUserRoleId), catchAsync(userRoleController.getUserRole));
router.post(
  '/',
  validateBody(validateCreateUserRole),
  catchAsync(userRoleController.createUserRole)
);
router.patch(
  '/:id',
  validateParam(validateUserRoleId),
  validateBody(validateUpdateUserRole),
  catchAsync(userRoleController.updateUserRole)
);
router.delete(
  '/:id',
  validateParam(validateUserRoleId),
  catchAsync(userRoleController.deleteUserRole)
);

export default router;
