import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { validateCreateUser } from './user.validation.js';
import * as userController from './user.controller.js';

const router = Router();

router.get('/', catchAsync(userController.listUsers));
router.post('/', validateBody(validateCreateUser), catchAsync(userController.createUser));

export default router;
