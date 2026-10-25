import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { DEFECT_TYPES, PHYSICAL_DEFECT_TYPES } from '../../constants/enums.js';
import { parsePagination, toPage } from '../../utils/pagination.js';
import { findProductById } from '../product/product.repository.js';
import {
  findSummaryFilterRows,
  findSummaryMetricRows,
} from './aiInspectionPrediction/aiInspectionPrediction.repository.js';
import { expireStaleProcessingAiInspections } from './aiInspection/aiInspection.repository.js';
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
  await expireStaleProcessingAiInspections();
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

  const existing = await inspectionRepository.findLatestInspectionByProductAndUser(
    product_id,
    user_id
  );
  if (existing) {
    return { inspection: serializeInspection(existing), created: false };
  }

  try {
    const inspection = await inspectionRepository.createInspection({
      userId: user_id,
      productId: product_id,
      createdBy: created_by ?? user_id,
      updatedBy: updated_by ?? user_id,
    });
    return { inspection: serializeInspection(inspection), created: true };
  } catch (err) {
    mapPrismaError(err, {
      P2003: { statusCode: 400, message: 'Invalid product or user reference' },
    });
  }
}

function mapLoggedInspectionRow(inspection) {
  const sku = inspection.product?.batch?.sku ?? null;
  const predictions = (inspection.aiInspections ?? []).flatMap((ai) => ai.predictions ?? []);
  let latestMs = 0;
  for (const prediction of predictions) {
    const value = prediction.verifiedAt ?? prediction.updatedAt;
    const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
  }

  return {
    id: inspection.id,
    inspection_id: inspection.id,
    status: inspection.status,
    inspector_id: inspection.userId,
    inspector_name: inspection.engineer?.name ?? null,
    timestamp: latestMs > 0 ? new Date(latestMs).toISOString() : null,
    inspection_date: inspection.inspectionDate.toISOString().slice(0, 10),
    product_id: inspection.productId,
    sku_id: sku?.id ?? null,
    sku_name: sku?.name ?? null,
    total_defects: predictions.filter((prediction) =>
      PHYSICAL_DEFECT_TYPES.includes(prediction.finalDefectType)
    ).length,
  };
}

const EMPTY_SUMMARY = {
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

function buildSummaryFromMetricRows(metricRows) {
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
    total_inspected: productIds.size,
    products_defective: defectiveInspections,
    total_predictions: totalPredictions,
    passed,
    failed,
    accepted: passed,
    defect_rate: pct(defectiveInspections, totalInspections),
    ai_acceptance_rate: pct(passed, totalPredictions),
    defect_breakdown: defectBreakdown,
  };
}

function buildFilterOptions(filterRows) {
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
  return { skus, batches };
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

  const { items: inspections, total } = await inspectionRepository.findLoggedInspections({
    engineerIds,
    inspectorId,
    defectType,
    skuId,
    skip,
    take,
  });

  return {
    items: inspections.map(mapLoggedInspectionRow),
    inspectors,
    skus,
    page,
    limit,
    total,
  };
}

export async function listOverviewInspections(query) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items: inspections, total } = await inspectionRepository.findLoggedInspections({
    skip,
    take,
  });

  return {
    items: inspections.map(mapLoggedInspectionRow),
    page,
    limit,
    total,
  };
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

  if (engineerIds.length === 0) {
    return { summary: EMPTY_SUMMARY, skus: [], batches: [] };
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

  const { skus, batches } = buildFilterOptions(filterRows);

  if (skuId && !skus.some((sku) => sku.id === skuId)) {
    return { summary: EMPTY_SUMMARY, skus, batches };
  }
  if (batchId && !batches.some((batch) => batch.id === batchId)) {
    return { summary: EMPTY_SUMMARY, skus, batches };
  }
  if (skuId && batchId) {
    const batch = batches.find((item) => item.id === batchId);
    if (batch && batch.sku_id !== skuId) {
      return { summary: EMPTY_SUMMARY, skus, batches };
    }
  }

  return {
    summary: buildSummaryFromMetricRows(metricRows),
    skus,
    batches,
  };
}

export async function getOverviewSummary() {
  const metricRows = await findSummaryMetricRows({});
  return { summary: buildSummaryFromMetricRows(metricRows) };
}

export async function getEngineerSummary(query) {
  const userId = requirePositiveInt(query.user_id, 'user_id');
  const metricRows = await findSummaryMetricRows({ userId });
  return { summary: buildSummaryFromMetricRows(metricRows) };
}
