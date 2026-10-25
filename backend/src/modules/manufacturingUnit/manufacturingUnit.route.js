import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { validateCreateManufacturingUnit } from './manufacturingUnit.validation.js';
import * as manufacturingUnitController from './manufacturingUnit.controller.js';

const router = Router();

router.get('/', catchAsync(manufacturingUnitController.listManufacturingUnits));
router.post(
  '/',
  validateBody(validateCreateManufacturingUnit),
  catchAsync(manufacturingUnitController.createManufacturingUnit)
);

export default router;
