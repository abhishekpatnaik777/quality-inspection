import { Router } from 'express';
import { AiInspectionStatus } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import {
  inspectionDetailInclude,
  isPrismaKnownError,
  serializeAiInspection,
  serializeInspection,
  serializePrediction,
} from '../db/serializers.js';
import {
  DEFECT_TYPES,
  PHYSICAL_DEFECT_TYPES,
  validateCreateInspection,
  validateInspectionId,
  validatePredictionId,
  validateVerifyPrediction,
} from '../lib/defects.js';
import { absoluteFromPublicUrl, inspectionImageUpload, publicImageUrl } from '../lib/uploads.js';
import { VisionError, predictDefectFromImage } from '../lib/vision.js';

const router = Router();

async function refreshInspectionOutcome(tx, inspectionId, updatedBy) {
  const predictions = await tx.aiInspectionPrediction.findMany({
    where: { aiInspection: { inspectionId } },
  });

  if (predictions.length === 0) return null;
  if (predictions.some((prediction) => prediction.status === 'pending')) return null;

  const results = await tx.inspectionResult.findMany({ where: { inspectionId } });
  const status = results.length > 0 ? 'fail' : 'pass';

  return tx.inspection.update({
    where: { id: inspectionId },
    data: { status, updatedBy },
    include: inspectionDetailInclude,
  });
}

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.user_id) {
      const userId = Number(req.query.user_id);
      if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'user_id must be a positive integer' });
      }
      where.userId = userId;
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: inspectionDetailInclude,
      orderBy: { id: 'desc' },
    });
    res.json(inspections.map(serializeInspection));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

/** Verified predictions logged by QEs reporting to this supervisor. */
router.get('/supervised', async (req, res) => {
  const supervisorId = Number(req.query.supervisor_id);
  if (!Number.isInteger(supervisorId) || supervisorId < 1) {
    return res.status(400).json({ error: 'supervisor_id must be a positive integer' });
  }

  let inspectorId = null;
  if (req.query.inspector_id) {
    inspectorId = Number(req.query.inspector_id);
    if (!Number.isInteger(inspectorId) || inspectorId < 1) {
      return res.status(400).json({ error: 'inspector_id must be a positive integer' });
    }
  }

  const defectType = req.query.defect_type ? String(req.query.defect_type) : null;
  if (defectType && !DEFECT_TYPES.includes(defectType)) {
    return res.status(400).json({ error: 'defect_type is invalid' });
  }

  let skuId = null;
  if (req.query.sku_id) {
    skuId = Number(req.query.sku_id);
    if (!Number.isInteger(skuId) || skuId < 1) {
      return res.status(400).json({ error: 'sku_id must be a positive integer' });
    }
  }

  try {
    const links = await prisma.userSupervisor.findMany({
      where: { supervisorId, status: 'active' },
      select: { userId: true },
    });
    const engineerIds = links.map((link) => link.userId);
    if (engineerIds.length === 0) {
      return res.json({ items: [], inspectors: [], skus: [] });
    }

    if (inspectorId && !engineerIds.includes(inspectorId)) {
      return res.status(403).json({ error: 'Inspector is not assigned to this supervisor' });
    }

    const [inspectors, skus] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: engineerIds } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      prisma.sku.findMany({
        where: {
          batches: {
            some: {
              products: {
                some: {
                  inspections: {
                    some: {
                      userId: { in: engineerIds },
                      aiInspections: {
                        some: {
                          predictions: {
                            some: { status: { in: ['approved', 'overridden'] } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (skuId && !skus.some((sku) => sku.id === skuId)) {
      return res.json({ items: [], inspectors, skus });
    }

    const predictions = await prisma.aiInspectionPrediction.findMany({
      where: {
        status: { in: ['approved', 'overridden'] },
        ...(defectType ? { finalDefectType: defectType } : {}),
        aiInspection: {
          inspection: {
            userId: inspectorId ? inspectorId : { in: engineerIds },
            ...(skuId
              ? {
                  product: {
                    batch: { skuId },
                  },
                }
              : {}),
          },
        },
      },
      include: {
        aiInspection: {
          include: {
            inspection: {
              include: {
                engineer: true,
                product: {
                  include: {
                    batch: {
                      include: { sku: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ verifiedAt: 'desc' }, { id: 'desc' }],
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

    res.json({ items, inspectors, skus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch supervised inspections' });
  }
});

/** Aggregated summary of verified predictions for QEs under this supervisor. */
router.get('/supervised/summary', async (req, res) => {
  const supervisorId = Number(req.query.supervisor_id);
  if (!Number.isInteger(supervisorId) || supervisorId < 1) {
    return res.status(400).json({ error: 'supervisor_id must be a positive integer' });
  }

  let skuId = null;
  if (req.query.sku_id) {
    skuId = Number(req.query.sku_id);
    if (!Number.isInteger(skuId) || skuId < 1) {
      return res.status(400).json({ error: 'sku_id must be a positive integer' });
    }
  }

  let batchId = null;
  if (req.query.batch_id) {
    batchId = Number(req.query.batch_id);
    if (!Number.isInteger(batchId) || batchId < 1) {
      return res.status(400).json({ error: 'batch_id must be a positive integer' });
    }
  }

  try {
    const links = await prisma.userSupervisor.findMany({
      where: { supervisorId, status: 'active' },
      select: { userId: true },
    });
    const engineerIds = links.map((link) => link.userId);

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
      return res.json({ summary: emptySummary, skus: [], batches: [] });
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

    const teamFilterScope = {
      userId: { in: engineerIds },
    };

    const [filterRows, metricRows] = await Promise.all([
      prisma.aiInspectionPrediction.findMany({
        where: {
          aiInspection: { inspection: teamFilterScope },
        },
        select: {
          aiInspection: {
            select: {
              inspection: {
                select: {
                  product: {
                    select: {
                      batch: {
                        select: {
                          id: true,
                          batchNumber: true,
                          skuId: true,
                          sku: { select: { id: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.aiInspectionPrediction.findMany({
        where: {
          aiInspection: { inspection: inspectionScope },
        },
        select: {
          status: true,
          finalDefectType: true,
          aiInspection: {
            select: {
              inspection: {
                select: { id: true, productId: true },
              },
            },
          },
        },
      }),
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
      return res.json({ summary: emptySummary, skus, batches });
    }
    if (batchId && !batches.some((batch) => batch.id === batchId)) {
      return res.json({ summary: emptySummary, skus, batches });
    }
    if (skuId && batchId) {
      const batch = batches.find((item) => item.id === batchId);
      if (batch && batch.sku_id !== skuId) {
        return res.json({ summary: emptySummary, skus, batches });
      }
    }

    const productIds = new Set();
    // inspection id -> true if any verified final is a physical defect
    const inspectionDefect = new Map();
    let passed = 0; // AI prediction accepted as-is
    let failed = 0; // AI prediction overridden
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

    res.json({
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch supervised summary' });
  }
});

router.get('/:id', async (req, res) => {
  const id = validateInspectionId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id: id.value },
      include: inspectionDetailInclude,
    });
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }
    res.json(serializeInspection(inspection));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateInspection(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { product_id, user_id, created_by, updated_by } = parsed.value;

  try {
    const [product, engineer] = await Promise.all([
      prisma.product.findUnique({ where: { id: product_id } }),
      prisma.user.findUnique({
        where: { id: user_id },
        include: { roles: true },
      }),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!engineer) {
      return res.status(404).json({ error: 'Quality engineer not found' });
    }
    const isQe = engineer.roles.some(
      (role) => role.role === 'quality_engineer' && role.status === 'active'
    );
    if (!isQe) {
      return res.status(400).json({ error: 'user_id must be an active quality engineer' });
    }

    const inspection = await prisma.inspection.create({
      data: {
        userId: user_id,
        productId: product_id,
        createdBy: created_by ?? user_id,
        updatedBy: updated_by ?? user_id,
      },
      include: inspectionDetailInclude,
    });

    res.status(201).json(serializeInspection(inspection));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'Invalid product or user reference' });
    }
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

router.post('/:id/ai-inspections', (req, res) => {
  inspectionImageUpload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Image upload failed' });
    }

    const id = validateInspectionId(req.params.id);
    if (!id.ok) {
      return res.status(id.statusCode).json({ error: id.error });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }

    const createdBy = req.body?.created_by ? Number(req.body.created_by) : null;
    const updatedBy = req.body?.updated_by ? Number(req.body.updated_by) : createdBy;

    try {
      const inspection = await prisma.inspection.findUnique({ where: { id: id.value } });
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      if (inspection.status !== 'pending') {
        return res.status(400).json({ error: 'Inspection is already finalized' });
      }

      const imageUrl = publicImageUrl(req.file.filename);
      const aiInspection = await prisma.aiInspection.create({
        data: {
          inspectionId: inspection.id,
          imageUrl,
          status: 'processing',
          createdBy: Number.isInteger(createdBy) ? createdBy : null,
          updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
        },
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

        await prisma.aiInspection.update({
          where: { id: aiInspection.id },
          data: {
            status: AiInspectionStatus.error,
            rawResponse: {
              error: String(visionErr.message || visionErr),
              code: visionErr instanceof VisionError ? visionErr.code : 'vision_error',
            },
            updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
          },
        });
        return res.status(statusCode).json({
          error: errorMessage,
          ai_inspection_id: aiInspection.id,
          image_url: imageUrl,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.aiInspectionPrediction.createMany({
          data: predictionPayload.predictions.map((prediction) => ({
            aiInspectionId: aiInspection.id,
            aiDefectType: prediction.aiDefectType,
            confidence: prediction.confidence,
            status: 'pending',
            createdBy: Number.isInteger(createdBy) ? createdBy : null,
            updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
          })),
        });

        const updatedAi = await tx.aiInspection.update({
          where: { id: aiInspection.id },
          data: {
            status: 'awaiting_verification',
            rawResponse: predictionPayload.rawResponse,
            updatedBy: Number.isInteger(updatedBy) ? updatedBy : null,
          },
          include: {
            predictions: { orderBy: { id: 'asc' } },
          },
        });

        return { aiInspection: updatedAi };
      });

      const labels = result.aiInspection.predictions
        .map((prediction) => `${prediction.aiDefectType} (${prediction.confidence})`)
        .join(', ');

      res.status(201).json({
        message: `AI predicted ${result.aiInspection.predictions.length} defect(s): ${labels}. Review each before saving.`,
        ai_inspection: serializeAiInspection(result.aiInspection),
        predictions: result.aiInspection.predictions.map(serializePrediction),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to run AI inspection' });
    }
  });
});

router.post('/:id/predictions/:predictionId/verify', async (req, res) => {
  const inspectionId = validateInspectionId(req.params.id);
  if (!inspectionId.ok) {
    return res.status(inspectionId.statusCode).json({ error: inspectionId.error });
  }
  const predictionId = validatePredictionId(req.params.predictionId);
  if (!predictionId.ok) {
    return res.status(predictionId.statusCode).json({ error: predictionId.error });
  }

  const parsed = validateVerifyPrediction(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { action, final_defect_type, comment, verified_by, updated_by } = parsed.value;

  try {
    const prediction = await prisma.aiInspectionPrediction.findUnique({
      where: { id: predictionId.value },
      include: { aiInspection: true },
    });

    if (!prediction || prediction.aiInspection.inspectionId !== inspectionId.value) {
      return res.status(404).json({ error: 'Prediction not found for this inspection' });
    }
    if (prediction.status !== 'pending') {
      return res.status(400).json({ error: 'Prediction is already verified' });
    }

    const finalDefectType = action === 'approve' ? prediction.aiDefectType : final_defect_type;
    const status = action === 'approve' ? 'approved' : 'overridden';
    const actor = updated_by ?? verified_by;

    const inspection = await prisma.$transaction(async (tx) => {
      await tx.aiInspectionPrediction.update({
        where: { id: prediction.id },
        data: {
          status,
          finalDefectType,
          comment,
          verifiedBy: verified_by,
          verifiedAt: new Date(),
          updatedBy: actor,
        },
      });

      if (PHYSICAL_DEFECT_TYPES.includes(finalDefectType)) {
        await tx.inspectionResult.create({
          data: {
            inspectionId: inspectionId.value,
            aiInspectionPredictionId: prediction.id,
            defectType: finalDefectType,
            createdBy: actor,
            updatedBy: actor,
          },
        });
      }

      const pendingForAi = await tx.aiInspectionPrediction.count({
        where: {
          aiInspectionId: prediction.aiInspectionId,
          status: 'pending',
        },
      });
      if (pendingForAi === 0) {
        await tx.aiInspection.update({
          where: { id: prediction.aiInspectionId },
          data: { status: 'completed', updatedBy: actor },
        });
      }

      const refreshed = await refreshInspectionOutcome(tx, inspectionId.value, actor);
      if (refreshed) return refreshed;

      return tx.inspection.findUnique({
        where: { id: inspectionId.value },
        include: inspectionDetailInclude,
      });
    });

    res.json({
      message:
        action === 'approve'
          ? 'Prediction approved.'
          : `Prediction overridden to ${finalDefectType}.`,
      inspection: serializeInspection(inspection),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify prediction' });
  }
});

export default router;
