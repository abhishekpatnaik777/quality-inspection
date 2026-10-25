import { prisma } from '../../config/database.js';
import { productListInclude } from './product.serializer.js';

export async function findAllProducts({ skip, take } = {}) {
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      include: productListInclude,
      orderBy: { id: 'asc' },
      skip,
      take,
    }),
    prisma.product.count(),
  ]);
  return { items, total };
}

export async function findProductById(id) {
  return prisma.product.findUnique({ where: { id } });
}

export async function findSkuAndUnit(skuId, manufacturingUnitId) {
  const [sku, unit] = await Promise.all([
    prisma.sku.findUnique({ where: { id: skuId } }),
    prisma.manufacturingUnit.findUnique({ where: { id: manufacturingUnitId } }),
  ]);
  return { sku, unit };
}

export async function createBatchWithProducts({
  batchNumber,
  sku,
  unit,
  manufacturingDate,
  createdBy,
  updatedBy,
}) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        batchNumber,
        manufacturingUnitId: unit.id,
        skuId: sku.id,
        manufacturingDate,
        createdBy,
        updatedBy,
      },
      include: {
        sku: true,
        manufacturingUnit: true,
      },
    });

    await tx.product.createMany({
      data: Array.from({ length: unit.capacity }, () => ({
        batchId: batch.id,
        createdBy,
        updatedBy,
      })),
    });

    const products = await tx.product.findMany({
      where: { batchId: batch.id },
      orderBy: { id: 'asc' },
      include: productListInclude,
    });

    return { batch, products };
  });
}
