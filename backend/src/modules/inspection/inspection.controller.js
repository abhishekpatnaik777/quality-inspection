import { ApiError } from '../../utils/apiError.js';
import { inspectionImageUpload } from '../../utils/uploads.js';
import { validateInspectionId } from './inspection.validation.js';
import * as inspectionService from './inspection.service.js';

export async function listInspections(req, res) {
  const inspections = await inspectionService.listInspections(req.query);
  res.json(inspections);
}

export async function listSupervisedInspections(req, res) {
  const result = await inspectionService.listSupervisedInspections(req.query);
  res.json(result);
}

export async function getSupervisedSummary(req, res) {
  const result = await inspectionService.getSupervisedSummary(req.query);
  res.json(result);
}

export async function getInspection(req, res) {
  const inspection = await inspectionService.getInspection(req.validatedParams.id);
  res.json(inspection);
}

export async function createInspection(req, res) {
  const inspection = await inspectionService.createInspection(req.validatedBody);
  res.status(201).json(inspection);
}

export function runAiInspection(req, res, next) {
  inspectionImageUpload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return next(new ApiError(400, uploadErr.message || 'Image upload failed'));
    }

    try {
      const id = validateInspectionId(req.params.id);
      if (!id.ok) {
        return next(new ApiError(id.statusCode, id.error));
      }
      if (!req.file) {
        return next(new ApiError(400, 'image file is required'));
      }

      const createdBy = req.body?.created_by ? Number(req.body.created_by) : null;
      const updatedBy = req.body?.updated_by ? Number(req.body.updated_by) : createdBy;

      const result = await inspectionService.runAiInspection({
        inspectionId: id.value,
        filename: req.file.filename,
        createdBy: Number.isInteger(createdBy) ? createdBy : null,
        updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
      });

      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  });
}

export async function verifyPrediction(req, res) {
  const result = await inspectionService.verifyPrediction({
    inspectionId: req.validatedParams.id,
    predictionId: req.validatedParams.predictionId,
    ...req.validatedBody,
  });
  res.json(result);
}
