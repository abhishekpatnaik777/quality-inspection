import { prisma } from '../../config/database.js';

export async function findAllManufacturingUnits() {
  return prisma.manufacturingUnit.findMany({ orderBy: { id: 'asc' } });
}

export async function findManufacturingUnitById(id) {
  return prisma.manufacturingUnit.findUnique({ where: { id } });
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
