import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { validateCreateSku } from './sku.validation.js';
import * as skuController from './sku.controller.js';

const router = Router();

router.get('/', catchAsync(skuController.listSkus));
router.post('/', validateBody(validateCreateSku), catchAsync(skuController.createSku));

export default router;
