import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { PHYSICAL_DEFECT_TYPES } from '../../constants/enums.js';
import { serializeInspection } from '../inspection/inspection.serializer.js';
import {
  findInspectionByIdWithClient,
  refreshInspectionOutcome,
} from '../inspection/inspection.repository.js';
import { markAiInspectionCompleted } from '../aiInspection/aiInspection.repository.js';
import { createInspectionResult } from '../inspectionResult/inspectionResult.repository.js';
import * as predictionRepository from './aiInspectionPrediction.repository.js';

export async function verifyPrediction({
  inspectionId,
  predictionId,
  action,
  final_defect_type,
  comment,
  verified_by,
  updated_by,
}) {
  const prediction = await predictionRepository.findPredictionWithAiInspection(predictionId);

  if (!prediction || prediction.aiInspection.inspectionId !== inspectionId) {
    throw new ApiError(404, 'Prediction not found for this inspection');
  }
  if (prediction.status !== 'pending') {
    throw new ApiError(400, 'Prediction is already verified');
  }

  const finalDefectType = action === 'approve' ? prediction.aiDefectType : final_defect_type;
  const status = action === 'approve' ? 'approved' : 'overridden';
  const actor = updated_by ?? verified_by;

  const inspection = await prisma.$transaction(async (tx) => {
    await predictionRepository.updatePrediction(tx, prediction.id, {
      status,
      finalDefectType,
      comment,
      verifiedBy: verified_by,
      verifiedAt: new Date(),
      updatedBy: actor,
    });

    if (PHYSICAL_DEFECT_TYPES.includes(finalDefectType)) {
      await createInspectionResult(tx, {
        inspectionId,
        aiInspectionPredictionId: prediction.id,
        defectType: finalDefectType,
        createdBy: actor,
        updatedBy: actor,
      });
    }

    const pendingForAi = await predictionRepository.countPendingForAiInspection(
      tx,
      prediction.aiInspectionId
    );
    if (pendingForAi === 0) {
      await markAiInspectionCompleted(tx, prediction.aiInspectionId, actor);
    }

    const refreshed = await refreshInspectionOutcome(tx, inspectionId, actor);
    if (refreshed) return refreshed;

    return findInspectionByIdWithClient(tx, inspectionId);
  });

  return {
    message:
      action === 'approve'
        ? 'Prediction approved.'
        : `Prediction overridden to ${finalDefectType}.`,
    inspection: serializeInspection(inspection),
  };
}
