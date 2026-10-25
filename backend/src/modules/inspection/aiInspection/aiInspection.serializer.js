import { serializePrediction } from '../aiInspectionPrediction/aiInspectionPrediction.serializer.js';

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeAiInspection(aiInspection) {
  if (!aiInspection) return null;
  return {
    id: aiInspection.id,
    inspection_id: aiInspection.inspectionId,
    image_url: aiInspection.imageUrl,
    status: aiInspection.status,
    raw_response: aiInspection.rawResponse,
    created_at: toIso(aiInspection.createdAt),
    created_by: aiInspection.createdBy,
    updated_at: toIso(aiInspection.updatedAt),
    updated_by: aiInspection.updatedBy,
    predictions: (aiInspection.predictions ?? []).map(serializePrediction),
  };
}
