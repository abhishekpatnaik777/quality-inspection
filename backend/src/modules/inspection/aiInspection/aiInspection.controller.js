import { ApiError } from '../../../utils/apiError.js';
import * as aiInspectionService from './aiInspection.service.js';

export async function runAiInspection(req, res) {
  if (!req.file) {
    throw new ApiError(400, 'image file is required');
  }

  const createdBy = req.body?.created_by ? Number(req.body.created_by) : null;
  const updatedBy = req.body?.updated_by ? Number(req.body.updated_by) : createdBy;

  const result = await aiInspectionService.runAiInspection({
    inspectionId: req.validatedParams.id,
    filename: req.file.filename,
    createdBy: Number.isInteger(createdBy) ? createdBy : null,
    updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
  });

  res.status(202).json(result);
}
