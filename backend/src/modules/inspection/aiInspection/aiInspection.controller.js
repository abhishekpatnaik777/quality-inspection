import { ApiError } from '../../../utils/apiError.js';
import { inspectionImageUpload } from '../../../utils/uploads.js';
import { validateInspectionId } from '../inspection.validation.js';
import * as aiInspectionService from './aiInspection.service.js';

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

      const result = await aiInspectionService.runAiInspection({
        inspectionId: id.value,
        filename: req.file.filename,
        createdBy: Number.isInteger(createdBy) ? createdBy : null,
        updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
      });

      return res.status(202).json(result);
    } catch (err) {
      return next(err);
    }
  });
}
