function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function decimalToNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  return Number(value);
}

export function serializePrediction(prediction) {
  if (!prediction) return null;
  return {
    id: prediction.id,
    ai_inspection_id: prediction.aiInspectionId,
    ai_defect_type: prediction.aiDefectType,
    confidence: decimalToNumber(prediction.confidence),
    status: prediction.status,
    final_defect_type: prediction.finalDefectType,
    comment: prediction.comment,
    verified_by: prediction.verifiedBy,
    verified_at: toIso(prediction.verifiedAt),
    created_at: toIso(prediction.createdAt),
    created_by: prediction.createdBy,
    updated_at: toIso(prediction.updatedAt),
    updated_by: prediction.updatedBy,
  };
}
