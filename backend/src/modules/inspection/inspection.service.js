import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { DEFECT_TYPES, PHYSICAL_DEFECT_TYPES } from '../../constants/enums.js';
import { parsePagination, toPage } from '../../utils/pagination.js';
import { findProductById } from '../product/product.repository.js';
import {
  findSupervisedPredictions,
  findSummaryFilterRows,
  findSummaryMetricRows,
} from '../aiInspectionPrediction/aiInspectionPrediction.repository.js';
import { serializeInspection } from './inspection.serializer.js';
import * as inspectionRepository from './inspection.repository.js';

function requirePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new ApiError(400, `${fieldName} must be a positive integer`);
  }
  return num;
}

export async function listInspections(query) {
  const { page, limit, skip, take } = parsePagination(query);
  const where = {};
  if (query.user_id) {
    where.userId = requirePositiveInt(query.user_id, 'user_id');
  }

  const { items, total } = await inspectionRepository.findInspections(where, { skip, take });
  return toPage({
    items: items.map(serializeInspection),
    page,
    limit,
    total,
  });
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
  const { page, limit, skip, take } = parsePagination(query);
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
    return { items: [], inspectors: [], skus: [], page, limit, total: 0 };
  }

  if (inspectorId && !engineerIds.includes(inspectorId)) {
    throw new ApiError(403, 'Inspector is not assigned to this supervisor');
  }

  const [inspectors, skus] = await Promise.all([
    inspectionRepository.findUsersByIds(engineerIds),
    inspectionRepository.findSkusForEngineers(engineerIds),
  ]);

  if (skuId && !skus.some((sku) => sku.id === skuId)) {
    return { items: [], inspectors, skus, page, limit, total: 0 };
  }

  const { items: predictions, total } = await findSupervisedPredictions({
    engineerIds,
    inspectorId,
    defectType,
    skuId,
    skip,
    take,
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

  return { items, inspectors, skus, page, limit, total };
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
    findSummaryFilterRows(engineerIds),
    findSummaryMetricRows(inspectionScope),
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
