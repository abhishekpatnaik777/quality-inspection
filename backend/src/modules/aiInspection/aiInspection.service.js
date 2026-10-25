import { AiInspectionStatus } from '@prisma/client';
import { ApiError } from '../../utils/apiError.js';
import { absoluteFromPublicUrl, publicImageUrl } from '../../utils/uploads.js';
import { findInspectionRecord } from '../inspection/inspection.repository.js';
import { serializeAiInspection } from './aiInspection.serializer.js';
import * as aiInspectionRepository from './aiInspection.repository.js';
import { VisionError, predictDefectFromImage } from './vision.service.js';

async function finishAiInspectionInBackground({ aiInspectionId, imageUrl, createdBy, updatedBy }) {
  try {
    const predictionPayload = await predictDefectFromImage(absoluteFromPublicUrl(imageUrl));
    await aiInspectionRepository.completeAiInspectionWithPredictions({
      aiInspectionId,
      predictions: predictionPayload.predictions,
      rawResponse: predictionPayload.rawResponse,
      createdBy,
      updatedBy,
    });
  } catch (visionErr) {
    console.error(visionErr);
    const outOfCredits =
      visionErr?.code === 'out_of_credits' || visionErr?.message === 'Out of credits';
    await aiInspectionRepository.markAiInspectionError(aiInspectionId, {
      status: AiInspectionStatus.error,
      rawResponse: {
        error: outOfCredits ? 'Out of credits' : String(visionErr.message || visionErr),
        code:
          visionErr instanceof VisionError
            ? visionErr.code
            : outOfCredits
              ? 'out_of_credits'
              : 'vision_error',
      },
      updatedBy,
    });
  }
}

export async function runAiInspection({ inspectionId, filename, createdBy, updatedBy }) {
  const inspection = await findInspectionRecord(inspectionId);
  if (!inspection) {
    throw new ApiError(404, 'Inspection not found');
  }
  if (inspection.status !== 'pending') {
    throw new ApiError(400, 'Inspection is already finalized');
  }

  const imageUrl = publicImageUrl(filename);
  const aiInspection = await aiInspectionRepository.createAiInspection({
    inspectionId: inspection.id,
    imageUrl,
    status: 'processing',
    createdBy,
    updatedBy,
  });

  setImmediate(() => {
    finishAiInspectionInBackground({
      aiInspectionId: aiInspection.id,
      imageUrl,
      createdBy,
      updatedBy,
    }).catch((err) => {
      console.error('Background AI inspection failed', err);
    });
  });

  return {
    message: 'AI analysis started. Results will appear when processing completes.',
    ai_inspection: serializeAiInspection(aiInspection),
    predictions: [],
  };
}
