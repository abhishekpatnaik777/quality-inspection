import { AiInspectionStatus } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import { createManyPredictions } from '../aiInspectionPrediction/aiInspectionPrediction.repository.js';

const STALE_PROCESSING_MS = 2 * 60 * 60 * 1000;

export async function expireStaleProcessingAiInspections() {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  return prisma.aiInspection.updateMany({
    where: {
      status: AiInspectionStatus.processing,
      updatedAt: { lt: cutoff },
    },
    data: {
      status: AiInspectionStatus.error,
      rawResponse: {
        error: 'Analysis timed out',
        code: 'processing_timeout',
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

export async function markAiInspectionCompleted(tx, id, updatedBy) {
  return tx.aiInspection.update({
    where: { id },
    data: { status: 'completed', updatedBy },
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
    await createManyPredictions(
      tx,
      predictions.map((prediction) => ({
        aiInspectionId,
        aiDefectType: prediction.aiDefectType,
        confidence: prediction.confidence,
        status: 'pending',
        createdBy,
        updatedBy,
      }))
    );

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
