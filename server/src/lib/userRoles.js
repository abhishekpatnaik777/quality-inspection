import { z } from 'zod';
import { parseSchema } from './validate.js';
import { roleSchema, userRoleStatusSchema, USER_ROLES, USER_ROLE_STATUSES } from './enums.js';
import { userIdSchema } from './users.js';

export { USER_ROLES, USER_ROLE_STATUSES, roleSchema, userRoleStatusSchema };

export const userRoleIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const createUserRoleSchema = z.object({
  user_id: userIdSchema,
  role: roleSchema,
  status: userRoleStatusSchema.default('active'),
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export const updateUserRoleSchema = z
  .object({
    role: roleSchema.optional(),
    status: userRoleStatusSchema.optional(),
    updated_by: userIdSchema.nullable().optional(),
  })
  .refine(
    (data) => data.role !== undefined || data.status !== undefined || data.updated_by !== undefined,
    { message: 'At least one of role, status, or updated_by is required' }
  );

export function validateCreateUserRole(body) {
  return parseSchema(createUserRoleSchema, body ?? {});
}

export function validateUpdateUserRole(body) {
  const parsed = parseSchema(updateUserRoleSchema, body ?? {});
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      role: parsed.value.role ?? null,
      status: parsed.value.status ?? null,
      updated_by: parsed.value.updated_by === undefined ? null : parsed.value.updated_by,
    },
  };
}

export function validateUserRoleId(id) {
  return parseSchema(userRoleIdSchema, id);
}
