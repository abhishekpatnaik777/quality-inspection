import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { serializeUser, serializeUserSupervisor } from './user.serializer.js';
import * as userRepository from './user.repository.js';

export async function listUsers(query) {
  const search = typeof query.q === 'string' ? query.q.trim() : '';
  const roleFilter = typeof query.role === 'string' ? query.role.trim() : '';
  const users = await userRepository.findUsers({ search, roleFilter });
  return users.map(serializeUser);
}

export async function getUser(id) {
  const user = await userRepository.findUserById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return serializeUser(user);
}

export async function createUser(payload) {
  const { name, email, role, supervisor_id, created_by, updated_by } = payload;

  if (role === 'quality_engineer') {
    const supervisor = await userRepository.findActiveSupervisor(supervisor_id);
    if (!supervisor) {
      throw new ApiError(400, 'supervisor_id must be an active supervisor');
    }
  }

  try {
    const result = await userRepository.createUserWithRole({
      name,
      email,
      role,
      supervisor_id,
      created_by,
      updated_by,
    });

    const userRole = result.roles[0] ?? null;

    return {
      ...serializeUser({
        ...result,
        qualityEngineerLink: null,
      }),
      roles: [role],
      user_role: userRole
        ? {
            id: userRole.id,
            user_id: userRole.userId,
            role: userRole.role,
            status: userRole.status,
            created_at: userRole.createdAt,
            created_by: userRole.createdBy,
            updated_at: userRole.updatedAt,
            updated_by: userRole.updatedBy,
          }
        : null,
      user_supervisor: serializeUserSupervisor(result.qualityEngineerLink),
    };
  } catch (err) {
    mapPrismaError(err, {
      P2002: { statusCode: 409, message: 'email already exists' },
      P2003: {
        statusCode: 400,
        message: 'created_by, updated_by, or supervisor does not exist',
      },
    });
  }
}

export async function updateUser(id, payload) {
  const { name, email, status, updated_by } = payload;
  const data = {};
  if (name !== null) data.name = name;
  if (email !== null) data.email = email;
  if (status !== null) data.status = status;
  if (updated_by !== null) data.updatedBy = updated_by;

  try {
    const user = await userRepository.updateUser(id, data);
    return serializeUser(user);
  } catch (err) {
    mapPrismaError(err, {
      P2025: { statusCode: 404, message: 'User not found' },
      P2002: { statusCode: 409, message: 'email already exists' },
      P2003: { statusCode: 400, message: 'updated_by user does not exist' },
    });
  }
}

export async function deleteUser(id) {
  try {
    await userRepository.deleteUser(id);
  } catch (err) {
    mapPrismaError(err, {
      P2025: { statusCode: 404, message: 'User not found' },
    });
  }
}
