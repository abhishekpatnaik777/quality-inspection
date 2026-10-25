import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import { validateCreateUser, validateUpdateUser, validateUserId } from './user.validation.js';
import * as userController from './user.controller.js';

const router = Router();

router.get('/', catchAsync(userController.listUsers));
router.get('/:id', validateParam(validateUserId), catchAsync(userController.getUser));
router.post('/', validateBody(validateCreateUser), catchAsync(userController.createUser));
router.patch(
  '/:id',
  validateParam(validateUserId),
  validateBody(validateUpdateUser),
  catchAsync(userController.updateUser)
);
router.delete('/:id', validateParam(validateUserId), catchAsync(userController.deleteUser));

export default router;
