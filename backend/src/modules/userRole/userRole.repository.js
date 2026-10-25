import { prisma } from '../../config/database.js';

export async function findAllUserRoles({ skip, take } = {}) {
  const [items, total] = await Promise.all([
    prisma.userRole.findMany({
      include: { user: true },
      orderBy: { id: 'asc' },
      skip,
      take,
    }),
    prisma.userRole.count(),
  ]);
  return { items, total };
}

export async function findUserRoleById(id) {
  return prisma.userRole.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function createUserRole(data) {
  return prisma.userRole.create({
    data: {
      userId: data.user_id,
      role: data.role,
      status: data.status,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
    },
  });
}

export async function updateUserRole(id, data) {
  return prisma.userRole.update({
    where: { id },
    data,
  });
}

export async function deleteUserRole(id) {
  return prisma.userRole.delete({ where: { id } });
}
