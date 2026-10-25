import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { validateGenerateProducts } from './product.validation.js';
import * as productController from './product.controller.js';

const router = Router();

router.get('/', catchAsync(productController.listProducts));
router.post(
  '/generate',
  validateBody(validateGenerateProducts),
  catchAsync(productController.generateProducts)
);

export default router;
