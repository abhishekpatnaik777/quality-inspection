import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import {
  validateCreateManufacturingUnit,
  validateManufacturingUnitId,
} from './manufacturingUnit.validation.js';
import * as manufacturingUnitController from './manufacturingUnit.controller.js';

const router = Router();

router.get('/', catchAsync(manufacturingUnitController.listManufacturingUnits));
router.get(
  '/:id',
  validateParam(validateManufacturingUnitId),
  catchAsync(manufacturingUnitController.getManufacturingUnit)
);
router.post(
  '/',
  validateBody(validateCreateManufacturingUnit),
  catchAsync(manufacturingUnitController.createManufacturingUnit)
);

export default router;
