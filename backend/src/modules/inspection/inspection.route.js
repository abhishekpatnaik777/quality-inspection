import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { requireQualityEngineer } from '../../middlewares/requireQualityEngineer.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import {
  validateCreateInspection,
  validateInspectionId,
  validatePredictionId,
  validateVerifyPrediction,
} from './inspection.validation.js';
import * as inspectionController from './inspection.controller.js';

const router = Router();

router.get('/', catchAsync(inspectionController.listInspections));
router.get('/supervised', catchAsync(inspectionController.listSupervisedInspections));
router.get('/supervised/summary', catchAsync(inspectionController.getSupervisedSummary));
router.get(
  '/:id',
  validateParam(validateInspectionId),
  catchAsync(inspectionController.getInspection)
);
router.post(
  '/',
  requireQualityEngineer('user_id'),
  validateBody(validateCreateInspection),
  catchAsync(inspectionController.createInspection)
);
router.post('/:id/ai-inspections', inspectionController.runAiInspection);
router.post(
  '/:id/predictions/:predictionId/verify',
  validateParam(validateInspectionId),
  validateParam(validatePredictionId, 'predictionId'),
  validateBody(validateVerifyPrediction),
  catchAsync(inspectionController.verifyPrediction)
);

export default router;
