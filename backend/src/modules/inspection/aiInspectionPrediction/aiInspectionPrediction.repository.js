import { prisma } from '../../../config/database.js';

export async function createManyPredictions(tx, predictions) {
  return tx.aiInspectionPrediction.createMany({ data: predictions });
}

export async function findPredictionWithAiInspection(predictionId) {
  return prisma.aiInspectionPrediction.findUnique({
    where: { id: predictionId },
    include: { aiInspection: true },
  });
}

export async function updatePrediction(tx, id, data) {
  return tx.aiInspectionPrediction.update({
    where: { id },
    data,
  });
}

export async function countPendingForAiInspection(tx, aiInspectionId) {
  return tx.aiInspectionPrediction.count({
    where: {
      aiInspectionId,
      status: 'pending',
    },
  });
}

export async function findPredictionsByInspectionId(tx, inspectionId) {
  return tx.aiInspectionPrediction.findMany({
    where: { aiInspection: { inspectionId } },
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
