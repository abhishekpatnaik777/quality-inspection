import { AiInspectionStatus } from '@prisma/client';
import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { DEFECT_TYPES, PHYSICAL_DEFECT_TYPES } from '../../constants/enums.js';
import { absoluteFromPublicUrl, publicImageUrl } from '../../utils/uploads.js';
import { findProductById } from '../product/product.repository.js';
import {
  serializeAiInspection,
  serializeInspection,
  serializePrediction,
} from './inspection.serializer.js';
import * as inspectionRepository from './inspection.repository.js';
import { VisionError, predictDefectFromImage } from './vision.service.js';

function requirePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new ApiError(400, `${fieldName} must be a positive integer`);
  }
  return num;
}

export async function listInspections(query) {
  const where = {};
  if (query.user_id) {
    where.userId = requirePositiveInt(query.user_id, 'user_id');
  }

  const inspections = await inspectionRepository.findInspections(where);
  return inspections.map(serializeInspection);
}

export async function getInspection(id) {
  const inspection = await inspectionRepository.findInspectionById(id);
  if (!inspection) {
    throw new ApiError(404, 'Inspection not found');
  }
  return serializeInspection(inspection);
}

export async function createInspection(payload) {
  const { product_id, user_id, created_by, updated_by } = payload;

  const product = await findProductById(product_id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  try {
    const inspection = await inspectionRepository.createInspection({
      userId: user_id,
      productId: product_id,
      createdBy: created_by ?? user_id,
      updatedBy: updated_by ?? user_id,
    });
    return serializeInspection(inspection);
  } catch (err) {
    mapPrismaError(err, {
      P2003: { statusCode: 400, message: 'Invalid product or user reference' },
    });
  }
}

export async function listSupervisedInspections(query) {
  const supervisorId = requirePositiveInt(query.supervisor_id, 'supervisor_id');

  let inspectorId = null;
  if (query.inspector_id) {
    inspectorId = requirePositiveInt(query.inspector_id, 'inspector_id');
  }

  const defectType = query.defect_type ? String(query.defect_type) : null;
  if (defectType && !DEFECT_TYPES.includes(defectType)) {
    throw new ApiError(400, 'defect_type is invalid');
  }

  let skuId = null;
  if (query.sku_id) {
    skuId = requirePositiveInt(query.sku_id, 'sku_id');
  }

  const engineerIds = await inspectionRepository.findActiveEngineerIds(supervisorId);
  if (engineerIds.length === 0) {
    return { items: [], inspectors: [], skus: [] };
  }

  if (inspectorId && !engineerIds.includes(inspectorId)) {
    throw new ApiError(403, 'Inspector is not assigned to this supervisor');
  }

  const [inspectors, skus] = await Promise.all([
    inspectionRepository.findUsersByIds(engineerIds),
    inspectionRepository.findSkusForEngineers(engineerIds),
  ]);

  if (skuId && !skus.some((sku) => sku.id === skuId)) {
    return { items: [], inspectors, skus };
  }

  const predictions = await inspectionRepository.findSupervisedPredictions({
    engineerIds,
    inspectorId,
    defectType,
    skuId,
  });

  const items = predictions.map((prediction) => {
    const inspection = prediction.aiInspection.inspection;
    const sku = inspection.product?.batch?.sku ?? null;
    return {
      id: prediction.id,
      inspection_id: inspection.id,
      thumbnail_url: prediction.aiInspection.imageUrl,
      final_defect_type: prediction.finalDefectType,
      ai_defect_type: prediction.aiDefectType,
      prediction_status: prediction.status,
      ai_decision: prediction.status === 'approved' ? 'accepted' : 'overridden',
      inspector_id: inspection.userId,
      inspector_name: inspection.engineer?.name ?? null,
      timestamp: prediction.verifiedAt
        ? prediction.verifiedAt.toISOString()
        : prediction.updatedAt.toISOString(),
      inspection_date: inspection.inspectionDate.toISOString().slice(0, 10),
      product_id: inspection.productId,
      sku_id: sku?.id ?? null,
      sku_name: sku?.name ?? null,
    };
  });

  return { items, inspectors, skus };
}

export async function getSupervisedSummary(query) {
  const supervisorId = requirePositiveInt(query.supervisor_id, 'supervisor_id');

  let skuId = null;
  if (query.sku_id) {
    skuId = requirePositiveInt(query.sku_id, 'sku_id');
  }

  let batchId = null;
  if (query.batch_id) {
    batchId = requirePositiveInt(query.batch_id, 'batch_id');
  }

  const engineerIds = await inspectionRepository.findActiveEngineerIds(supervisorId);

  const emptySummary = {
    total_inspected: 0,
    products_defective: 0,
    total_predictions: 0,
    passed: 0,
    failed: 0,
    accepted: 0,
    defect_rate: 0,
    ai_acceptance_rate: 0,
    defect_breakdown: [],
  };

  if (engineerIds.length === 0) {
    return { summary: emptySummary, skus: [], batches: [] };
  }

  const inspectionScope = {
    userId: { in: engineerIds },
    ...(skuId || batchId
      ? {
          product: {
            batch: {
              ...(skuId ? { skuId } : {}),
              ...(batchId ? { id: batchId } : {}),
            },
          },
        }
      : {}),
  };

  const [filterRows, metricRows] = await Promise.all([
    inspectionRepository.findSummaryFilterRows(engineerIds),
    inspectionRepository.findSummaryMetricRows(inspectionScope),
  ]);

  const skuMap = new Map();
  const batchMap = new Map();
  for (const row of filterRows) {
    const batch = row.aiInspection?.inspection?.product?.batch;
    if (!batch) continue;
    if (batch.sku) {
      skuMap.set(batch.sku.id, { id: batch.sku.id, name: batch.sku.name });
    }
    batchMap.set(batch.id, {
      id: batch.id,
      batch_number: batch.batchNumber,
      sku_id: batch.skuId,
      sku_name: batch.sku?.name ?? null,
    });
  }

  const skus = [...skuMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const batches = [...batchMap.values()].sort((a, b) =>
    String(a.batch_number).localeCompare(String(b.batch_number))
  );

  if (skuId && !skus.some((sku) => sku.id === skuId)) {
    return { summary: emptySummary, skus, batches };
  }
  if (batchId && !batches.some((batch) => batch.id === batchId)) {
    return { summary: emptySummary, skus, batches };
  }
  if (skuId && batchId) {
    const batch = batches.find((item) => item.id === batchId);
    if (batch && batch.sku_id !== skuId) {
      return { summary: emptySummary, skus, batches };
    }
  }

  const productIds = new Set();
  const inspectionDefect = new Map();
  let passed = 0;
  let failed = 0;
  const breakdownMap = new Map();

  for (const row of metricRows) {
    const inspection = row.aiInspection?.inspection;
    if (!inspection) continue;

    productIds.add(inspection.productId);

    const isVerified = row.status === 'approved' || row.status === 'overridden';
    if (!isVerified) continue;

    if (!inspectionDefect.has(inspection.id)) {
      inspectionDefect.set(inspection.id, false);
    }

    if (row.status === 'approved') {
      passed += 1;
    } else if (row.status === 'overridden') {
      failed += 1;
    }

    const finalType = row.finalDefectType;
    if (finalType === 'no_defect') {
      breakdownMap.set('no_defect', (breakdownMap.get('no_defect') || 0) + 1);
    } else if (PHYSICAL_DEFECT_TYPES.includes(finalType)) {
      inspectionDefect.set(inspection.id, true);
      breakdownMap.set(finalType, (breakdownMap.get(finalType) || 0) + 1);
    }
  }

  const totalInspections = inspectionDefect.size;
  let defectiveInspections = 0;
  for (const isDefective of inspectionDefect.values()) {
    if (isDefective) defectiveInspections += 1;
  }

  const totalPredictions = passed + failed;
  const defectBreakdown = [...breakdownMap.entries()]
    .map(([defect_type, count]) => ({ defect_type, count }))
    .sort((a, b) => {
      if (a.defect_type === 'no_defect') return 1;
      if (b.defect_type === 'no_defect') return -1;
      return b.count - a.count || a.defect_type.localeCompare(b.defect_type);
    });

  const pct = (numerator, denominator) =>
    denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;

  return {
    summary: {
      total_inspected: productIds.size,
      products_defective: defectiveInspections,
      total_predictions: totalPredictions,
      passed,
      failed,
      accepted: passed,
      defect_rate: pct(defectiveInspections, totalInspections),
      ai_acceptance_rate: pct(passed, totalPredictions),
      defect_breakdown: defectBreakdown,
    },
    skus,
    batches,
  };
}

export async function runAiInspection({ inspectionId, filename, createdBy, updatedBy }) {
  const inspection = await inspectionRepository.findInspectionRecord(inspectionId);
  if (!inspection) {
    throw new ApiError(404, 'Inspection not found');
  }
  if (inspection.status !== 'pending') {
    throw new ApiError(400, 'Inspection is already finalized');
  }

  const imageUrl = publicImageUrl(filename);
  const aiInspection = await inspectionRepository.createAiInspection({
    inspectionId: inspection.id,
    imageUrl,
    status: 'processing',
    createdBy,
    updatedBy,
  });

  let predictionPayload;
  try {
    predictionPayload = await predictDefectFromImage(absoluteFromPublicUrl(imageUrl));
  } catch (visionErr) {
    console.error(visionErr);
    const outOfCredits =
      visionErr?.code === 'out_of_credits' || visionErr?.message === 'Out of credits';
    const statusCode = outOfCredits
      ? 429
      : visionErr instanceof VisionError
        ? visionErr.statusCode
        : 502;
    const errorMessage = outOfCredits
      ? 'Out of credits'
      : 'Vision model failed. Photo was saved; retry analysis or inspect manually.';

    await inspectionRepository.markAiInspectionError(aiInspection.id, {
      status: AiInspectionStatus.error,
      rawResponse: {
        error: String(visionErr.message || visionErr),
        code: visionErr instanceof VisionError ? visionErr.code : 'vision_error',
      },
      updatedBy,
    });

    throw new ApiError(statusCode, errorMessage, {
      ai_inspection_id: aiInspection.id,
      image_url: imageUrl,
    });
  }

  const updatedAi = await inspectionRepository.completeAiInspectionWithPredictions({
    aiInspectionId: aiInspection.id,
    predictions: predictionPayload.predictions,
    rawResponse: predictionPayload.rawResponse,
    createdBy,
    updatedBy,
  });

  const labels = updatedAi.predictions
    .map((prediction) => `${prediction.aiDefectType} (${prediction.confidence})`)
    .join(', ');

  return {
    message: `AI predicted ${updatedAi.predictions.length} defect(s): ${labels}. Review each before saving.`,
    ai_inspection: serializeAiInspection(updatedAi),
    predictions: updatedAi.predictions.map(serializePrediction),
  };
}

export async function verifyPrediction({
  inspectionId,
  predictionId,
  action,
  final_defect_type,
  comment,
  verified_by,
  updated_by,
}) {
  const prediction = await inspectionRepository.findPredictionWithAiInspection(predictionId);

  if (!prediction || prediction.aiInspection.inspectionId !== inspectionId) {
    throw new ApiError(404, 'Prediction not found for this inspection');
  }
  if (prediction.status !== 'pending') {
    throw new ApiError(400, 'Prediction is already verified');
  }

  const finalDefectType = action === 'approve' ? prediction.aiDefectType : final_defect_type;
  const status = action === 'approve' ? 'approved' : 'overridden';
  const actor = updated_by ?? verified_by;

  const inspection = await inspectionRepository.verifyPredictionTransaction({
    prediction,
    inspectionId,
    status,
    finalDefectType,
    comment,
    verifiedBy: verified_by,
    actor,
    isPhysicalDefect: PHYSICAL_DEFECT_TYPES.includes(finalDefectType),
  });

  return {
    message:
      action === 'approve'
        ? 'Prediction approved.'
        : `Prediction overridden to ${finalDefectType}.`,
    inspection: serializeInspection(inspection),
  };
}
