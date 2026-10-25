import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/apiError.js';
import { inspectionImageUpload } from '../../utils/uploads.js';
import { requireQualityEngineer } from '../../middlewares/requireQualityEngineer.js';
import { validateBody, validateParam } from '../../middlewares/validate.middleware.js';
import { validateCreateInspection, validateInspectionId } from './inspection.validation.js';
import {
  validatePredictionId,
  validateVerifyPrediction,
} from './aiInspectionPrediction/aiInspectionPrediction.validation.js';
import * as inspectionController from './inspection.controller.js';
import * as aiInspectionController from './aiInspection/aiInspection.controller.js';
import * as aiInspectionPredictionController from './aiInspectionPrediction/aiInspectionPrediction.controller.js';

const router = Router();

function uploadInspectionImage(req, res, next) {
  inspectionImageUpload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return next(new ApiError(400, uploadErr.message || 'Image upload failed'));
    }
    return next();
  });
}

router.get('/', catchAsync(inspectionController.listInspections));
router.get('/supervised', catchAsync(inspectionController.listSupervisedInspections));
router.get('/supervised/summary', catchAsync(inspectionController.getSupervisedSummary));
router.get('/overview', catchAsync(inspectionController.listOverviewInspections));
router.get('/overview/summary', catchAsync(inspectionController.getOverviewSummary));
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
router.post(
  '/:id/ai-inspections',
  validateParam(validateInspectionId),
  uploadInspectionImage,
  requireQualityEngineer('created_by'),
  catchAsync(aiInspectionController.runAiInspection)
);
router.post(
  '/:id/predictions/:predictionId/verify',
  validateParam(validateInspectionId),
  validateParam(validatePredictionId, 'predictionId'),
  validateBody(validateVerifyPrediction),
  requireQualityEngineer('verified_by'),
  catchAsync(aiInspectionPredictionController.verifyPrediction)
);

export default router;
