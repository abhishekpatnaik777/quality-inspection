import { prisma } from '../../config/database.js';

export async function findAllSkus() {
  return prisma.sku.findMany({ orderBy: { id: 'asc' } });
}

export async function findSkuById(id) {
  return prisma.sku.findUnique({ where: { id } });
}

export async function createSku(data) {
  return prisma.sku.create({
    data: {
      name: data.name,
      category: data.category,
      model: data.model,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
    },
  });
}
