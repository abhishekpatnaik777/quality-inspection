function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeInspectionResult(result) {
  if (!result) return null;
  return {
    id: result.id,
    inspection_id: result.inspectionId,
    ai_inspection_prediction_id: result.aiInspectionPredictionId,
    defect_type: result.defectType,
    created_at: toIso(result.createdAt),
    created_by: result.createdBy,
    updated_at: toIso(result.updatedAt),
    updated_by: result.updatedBy,
  };
}
