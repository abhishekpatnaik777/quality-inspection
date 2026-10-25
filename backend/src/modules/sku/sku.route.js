import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import { validateCreateSku, validateSkuId } from './sku.validation.js';
import * as skuController from './sku.controller.js';

const router = Router();

router.get('/', catchAsync(skuController.listSkus));
router.get('/:id', validateParam(validateSkuId), catchAsync(skuController.getSku));
router.post('/', validateBody(validateCreateSku), catchAsync(skuController.createSku));

export default router;
