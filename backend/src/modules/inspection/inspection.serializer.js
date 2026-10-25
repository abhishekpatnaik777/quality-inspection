import { serializeProduct } from '../product/product.serializer.js';

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

export function serializeInspection(inspection) {
  if (!inspection) return null;
  return {
    id: inspection.id,
    user_id: inspection.userId,
    product_id: inspection.productId,
    inspection_date: toIso(inspection.inspectionDate)?.slice(0, 10),
    status: inspection.status,
    created_at: toIso(inspection.createdAt),
    created_by: inspection.createdBy,
    updated_at: toIso(inspection.updatedAt),
    updated_by: inspection.updatedBy,
    engineer_name: inspection.engineer?.name,
    product: inspection.product ? serializeProduct(inspection.product) : null,
    ai_inspections: (inspection.aiInspections ?? []).map(serializeAiInspection),
    results: (inspection.results ?? []).map(serializeInspectionResult),
  };
}

export const inspectionDetailInclude = {
  engineer: true,
  product: {
    include: {
      batch: {
        include: {
          sku: true,
          manufacturingUnit: true,
        },
      },
    },
  },
  aiInspections: {
    include: {
      predictions: {
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  },
  results: {
    orderBy: { id: 'asc' },
  },
};
