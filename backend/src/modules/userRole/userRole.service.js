import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { parsePagination, toPage } from '../../utils/pagination.js';
import { serializeUserRole } from './userRole.serializer.js';
import * as userRoleRepository from './userRole.repository.js';

export async function listUserRoles(query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await userRoleRepository.findAllUserRoles({ skip, take });
  return toPage({
    items: items.map(serializeUserRole),
    page,
    limit,
    total,
  });
}

export async function getUserRole(id) {
  const role = await userRoleRepository.findUserRoleById(id);
  if (!role) {
    throw new ApiError(404, 'User role not found');
  }
  return serializeUserRole(role);
}

export async function createUserRole(payload) {
  try {
    const created = await userRoleRepository.createUserRole(payload);
    return serializeUserRole(created);
  } catch (err) {
    mapPrismaError(err, {
      P2003: {
        statusCode: 400,
        message: 'user_id, created_by, or updated_by does not exist',
      },
      P2002: { statusCode: 409, message: 'user already has this role' },
    });
  }
}

export async function updateUserRole(id, payload) {
  const { role, status, updated_by } = payload;
  const data = {};
  if (role !== null) data.role = role;
  if (status !== null) data.status = status;
  if (updated_by !== null) data.updatedBy = updated_by;

  try {
    const updated = await userRoleRepository.updateUserRole(id, data);
    return serializeUserRole(updated);
  } catch (err) {
    mapPrismaError(err, {
      P2025: { statusCode: 404, message: 'User role not found' },
      P2002: { statusCode: 409, message: 'user already has this role' },
      P2003: { statusCode: 400, message: 'updated_by user does not exist' },
    });
  }
}

export async function deleteUserRole(id) {
  try {
    await userRoleRepository.deleteUserRole(id);
  } catch (err) {
    mapPrismaError(err, {
      P2025: { statusCode: 404, message: 'User role not found' },
    });
  }
}
