import { prisma } from '../../config/database.js';
import { userListInclude } from './user.serializer.js';

function buildUserWhere({ search = '', roleFilter = '' } = {}) {
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (roleFilter) {
    where.roles = {
      some: {
        role: roleFilter,
        status: 'active',
      },
    };
  }

  return where;
}

export async function findUsers({ search = '', roleFilter = '', skip, take } = {}) {
  const where = buildUserWhere({ search, roleFilter });

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userListInclude,
      orderBy: { id: 'asc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: userListInclude,
  });
}

export async function findUserWithRoles(id) {
  return prisma.user.findUnique({
    where: { id },
    include: { roles: true },
  });
}

export async function findActiveSupervisor(supervisorId) {
  return prisma.user.findFirst({
    where: {
      id: supervisorId,
      status: 'active',
      roles: {
        some: {
          role: 'supervisor',
          status: 'active',
        },
      },
    },
  });
}

export async function createUserWithRole(data) {
  return prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        status: 'active',
        createdBy: data.created_by,
        updatedBy: data.updated_by,
        roles: {
          create: {
            role: data.role,
            status: 'active',
            createdBy: data.created_by,
            updatedBy: data.updated_by,
          },
        },
        ...(data.role === 'quality_engineer'
          ? {
              qualityEngineerLink: {
                create: {
                  supervisorId: data.supervisor_id,
                  status: 'active',
                  createdBy: data.created_by,
                  updatedBy: data.updated_by,
                },
              },
            }
          : {}),
      },
      include: {
        roles: true,
        qualityEngineerLink: true,
      },
    });
  });
}

export async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    include: userListInclude,
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}
