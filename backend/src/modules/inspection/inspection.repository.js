import { prisma } from '../../config/database.js';
import { inspectionDetailInclude } from './inspection.serializer.js';

export async function findInspections(where = {}) {
  return prisma.inspection.findMany({
    where,
    include: inspectionDetailInclude,
    orderBy: { id: 'desc' },
  });
}

export async function findInspectionById(id) {
  return prisma.inspection.findUnique({
    where: { id },
    include: inspectionDetailInclude,
  });
}

export async function findInspectionRecord(id) {
  return prisma.inspection.findUnique({ where: { id } });
}

export async function createInspection(data) {
  return prisma.inspection.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    },
    include: inspectionDetailInclude,
  });
}

export async function findActiveEngineerIds(supervisorId) {
  const links = await prisma.userSupervisor.findMany({
    where: { supervisorId, status: 'active' },
    select: { userId: true },
  });
  return links.map((link) => link.userId);
}

export async function findUsersByIds(ids) {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

export async function findSkusForEngineers(engineerIds) {
  return prisma.sku.findMany({
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
  });
}

export async function findSupervisedPredictions({ engineerIds, inspectorId, defectType, skuId }) {
  return prisma.aiInspectionPrediction.findMany({
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
}

export async function findSummaryFilterRows(engineerIds) {
  return prisma.aiInspectionPrediction.findMany({
    where: {
      aiInspection: { inspection: { userId: { in: engineerIds } } },
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
  });
}

export async function findSummaryMetricRows(inspectionScope) {
  return prisma.aiInspectionPrediction.findMany({
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
  });
}

export async function createAiInspection(data) {
  return prisma.aiInspection.create({ data });
}

export async function markAiInspectionError(id, data) {
  return prisma.aiInspection.update({
    where: { id },
    data,
  });
}

export async function completeAiInspectionWithPredictions({
  aiInspectionId,
  predictions,
  rawResponse,
  createdBy,
  updatedBy,
}) {
  return prisma.$transaction(async (tx) => {
    await tx.aiInspectionPrediction.createMany({
      data: predictions.map((prediction) => ({
        aiInspectionId,
        aiDefectType: prediction.aiDefectType,
        confidence: prediction.confidence,
        status: 'pending',
        createdBy,
        updatedBy,
      })),
    });

    return tx.aiInspection.update({
      where: { id: aiInspectionId },
      data: {
        status: 'awaiting_verification',
        rawResponse,
        updatedBy,
      },
      include: {
        predictions: { orderBy: { id: 'asc' } },
      },
    });
  });
}

export async function findPredictionWithAiInspection(predictionId) {
  return prisma.aiInspectionPrediction.findUnique({
    where: { id: predictionId },
    include: { aiInspection: true },
  });
}

export async function verifyPredictionTransaction({
  prediction,
  inspectionId,
  status,
  finalDefectType,
  comment,
  verifiedBy,
  actor,
  isPhysicalDefect,
}) {
  return prisma.$transaction(async (tx) => {
    await tx.aiInspectionPrediction.update({
      where: { id: prediction.id },
      data: {
        status,
        finalDefectType,
        comment,
        verifiedBy,
        verifiedAt: new Date(),
        updatedBy: actor,
      },
    });

    if (isPhysicalDefect) {
      await tx.inspectionResult.create({
        data: {
          inspectionId,
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

    const refreshed = await refreshInspectionOutcome(tx, inspectionId, actor);
    if (refreshed) return refreshed;

    return tx.inspection.findUnique({
      where: { id: inspectionId },
      include: inspectionDetailInclude,
    });
  });
}

export async function refreshInspectionOutcome(tx, inspectionId, updatedBy) {
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
