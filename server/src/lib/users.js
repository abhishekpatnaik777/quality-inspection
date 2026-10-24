import { z } from 'zod';
import { parseSchema } from './validate.js';
import { roleSchema, userStatusSchema, USER_STATUSES } from './enums.js';

export { USER_STATUSES };

export const userIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'name is required' })
      .trim()
      .min(1, 'name is required')
      .max(255, 'name must be at most 255 characters'),
    email: z
      .string({ required_error: 'email is required' })
      .trim()
      .email('email must be a valid email address')
      .max(255, 'email must be at most 255 characters'),
    role: roleSchema,
    supervisor_id: userIdSchema.optional().nullable(),
    created_by: userIdSchema.nullable().optional().default(null),
    updated_by: userIdSchema.nullable().optional().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'quality_engineer') {
      if (data.supervisor_id == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['supervisor_id'],
          message: 'supervisor_id is required for quality engineers',
        });
      }
    } else if (data.supervisor_id != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supervisor_id'],
        message: 'supervisor_id is only allowed for quality engineers',
      });
    }
  });

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name must be a non-empty string')
      .max(255, 'name must be at most 255 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('email must be a valid email address')
      .max(255, 'email must be at most 255 characters')
      .optional(),
    status: userStatusSchema.optional(),
    updated_by: userIdSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.status !== undefined ||
      data.updated_by !== undefined,
    { message: 'At least one field is required' }
  );

export function validateCreateUser(body) {
  return parseSchema(createUserSchema, body ?? {});
}

export function validateUpdateUser(body) {
  const parsed = parseSchema(updateUserSchema, body ?? {});
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      name: parsed.value.name ?? null,
      email: parsed.value.email ?? null,
      status: parsed.value.status ?? null,
      updated_by: parsed.value.updated_by === undefined ? null : parsed.value.updated_by,
    },
  };
}

export function validateUserId(id) {
  return parseSchema(userIdSchema, id);
}
