import { serializeProduct } from '../product/product.serializer.js';
import { serializeAiInspection } from '../aiInspection/aiInspection.serializer.js';
import { serializeInspectionResult } from '../inspectionResult/inspectionResult.serializer.js';

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
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
