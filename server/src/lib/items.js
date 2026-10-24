import { z } from 'zod';

export const ALLOWED_STATUSES = ['pending', 'passed', 'failed'];

export const itemStatusSchema = z.enum(ALLOWED_STATUSES);

export const createItemSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name is required')
    .max(255, 'name must be at most 255 characters'),
  status: itemStatusSchema.default('pending'),
  notes: z.string().trim().max(2000).nullable().optional().default(null),
});

export const updateItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name must be a non-empty string')
      .max(255, 'name must be at most 255 characters')
      .optional(),
    status: itemStatusSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.status !== undefined || data.notes !== undefined,
    {
      message: 'At least one of name, status, or notes is required',
    }
  );

export const itemIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

function formatZodError(error) {
  return error.issues.map((issue) => issue.message).join('; ');
}

export function parseSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: formatZodError(result.error),
      statusCode: 400,
    };
  }
  return { ok: true, value: result.data };
}

export function validateCreateItem(body) {
  return parseSchema(createItemSchema, body ?? {});
}

export function validateUpdateItem(body) {
  const parsed = parseSchema(updateItemSchema, body ?? {});
  if (!parsed.ok) {
    return parsed;
  }

  // COALESCE-friendly shape for the SQL update
  return {
    ok: true,
    value: {
      name: parsed.value.name ?? null,
      status: parsed.value.status ?? null,
      notes: parsed.value.notes === undefined ? null : parsed.value.notes,
    },
  };
}

export function validateItemId(id) {
  return parseSchema(itemIdSchema, id);
}
