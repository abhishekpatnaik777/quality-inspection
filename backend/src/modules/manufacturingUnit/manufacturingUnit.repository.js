import { prisma } from '../../config/database.js';

export async function findAllManufacturingUnits({ skip, take } = {}) {
  const [items, total] = await Promise.all([
    prisma.manufacturingUnit.findMany({ orderBy: { id: 'asc' }, skip, take }),
    prisma.manufacturingUnit.count(),
  ]);
  return { items, total };
}

export async function createManufacturingUnit(data) {
  return prisma.manufacturingUnit.create({
    data: {
      name: data.name,
      location: data.location,
      capacity: data.capacity,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
    },
  });
}
