import { prisma } from '../../config/database.js';
import { inspectionDetailInclude } from './inspection.serializer.js';
import { findPredictionsByInspectionId } from '../aiInspectionPrediction/aiInspectionPrediction.repository.js';
import { findResultsByInspectionId } from '../inspectionResult/inspectionResult.repository.js';

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

export async function findInspectionByIdWithClient(client, id) {
  return client.inspection.findUnique({
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

export async function refreshInspectionOutcome(tx, inspectionId, updatedBy) {
  const predictions = await findPredictionsByInspectionId(tx, inspectionId);

  if (predictions.length === 0) return null;
  if (predictions.some((prediction) => prediction.status === 'pending')) return null;

  const results = await findResultsByInspectionId(tx, inspectionId);
  const status = results.length > 0 ? 'fail' : 'pass';

  return tx.inspection.update({
    where: { id: inspectionId },
    data: { status, updatedBy },
    include: inspectionDetailInclude,
  });
}
