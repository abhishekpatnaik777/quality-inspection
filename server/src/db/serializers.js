function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeUser(user) {
  if (!user) return null;

  const activeRoles = (user.roles ?? [])
    .filter((role) => role.status === 'active')
    .map((role) => role.role)
    .sort();

  const link = user.qualityEngineerLink;
  const supervisor =
    link && link.status === 'active' && link.supervisor
      ? {
          id: link.id,
          supervisor_id: link.supervisorId,
          status: link.status,
          name: link.supervisor.name,
          email: link.supervisor.email,
        }
      : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    created_at: toIso(user.createdAt),
    created_by: user.createdBy,
    updated_at: toIso(user.updatedAt),
    updated_by: user.updatedBy,
    roles: activeRoles,
    supervisor,
  };
}

export function serializeUserRole(role) {
  if (!role) return null;

  return {
    id: role.id,
    user_id: role.userId,
    role: role.role,
    status: role.status,
    created_at: toIso(role.createdAt),
    created_by: role.createdBy,
    updated_at: toIso(role.updatedAt),
    updated_by: role.updatedBy,
    user_name: role.user?.name,
    user_email: role.user?.email,
  };
}

export function serializeUserSupervisor(link) {
  if (!link) return null;

  return {
    id: link.id,
    user_id: link.userId,
    supervisor_id: link.supervisorId,
    status: link.status,
    created_at: toIso(link.createdAt),
    created_by: link.createdBy,
    updated_at: toIso(link.updatedAt),
    updated_by: link.updatedBy,
  };
}

export function serializeSku(sku) {
  if (!sku) return null;
  return {
    id: sku.id,
    name: sku.name,
    category: sku.category,
    model: sku.model,
    created_at: toIso(sku.createdAt),
    created_by: sku.createdBy,
    updated_at: toIso(sku.updatedAt),
    updated_by: sku.updatedBy,
  };
}

export function serializeManufacturingUnit(unit) {
  if (!unit) return null;
  return {
    id: unit.id,
    name: unit.name,
    location: unit.location,
    capacity: unit.capacity,
    created_at: toIso(unit.createdAt),
    created_by: unit.createdBy,
    updated_at: toIso(unit.updatedAt),
    updated_by: unit.updatedBy,
  };
}

export function serializeBatch(batch) {
  if (!batch) return null;
  return {
    id: batch.id,
    batch_number: batch.batchNumber,
    manufacturing_unit_id: batch.manufacturingUnitId,
    sku_id: batch.skuId,
    manufacturing_date: toIso(batch.manufacturingDate)?.slice(0, 10),
    created_at: toIso(batch.createdAt),
    created_by: batch.createdBy,
    updated_at: toIso(batch.updatedAt),
    updated_by: batch.updatedBy,
    sku_name: batch.sku?.name,
    manufacturing_unit_name: batch.manufacturingUnit?.name,
  };
}

export function serializeProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    batch_id: product.batchId,
    created_at: toIso(product.createdAt),
    created_by: product.createdBy,
    updated_at: toIso(product.updatedAt),
    updated_by: product.updatedBy,
    batch_number: product.batch?.batchNumber,
    sku_id: product.batch?.skuId ?? product.batch?.sku?.id,
    sku_name: product.batch?.sku?.name,
    manufacturing_unit_id:
      product.batch?.manufacturingUnitId ?? product.batch?.manufacturingUnit?.id,
    manufacturing_unit_name: product.batch?.manufacturingUnit?.name,
  };
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

export function isPrismaKnownError(err, code) {
  return Boolean(err && err.code === code);
}

export const userListInclude = {
  roles: true,
  qualityEngineerLink: {
    include: {
      supervisor: true,
    },
  },
};
