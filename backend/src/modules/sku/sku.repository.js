import { prisma } from '../../config/database.js';

export async function findAllSkus({ skip, take } = {}) {
  const [items, total] = await Promise.all([
    prisma.sku.findMany({ orderBy: { id: 'asc' }, skip, take }),
    prisma.sku.count(),
  ]);
  return { items, total };
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
