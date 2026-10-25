import { z } from 'zod';
import { parseSchema } from '../../utils/validate.js';
import { userIdSchema } from '../user/user.validation.js';

export const inspectionIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const createInspectionSchema = z.object({
  product_id: inspectionIdSchema,
  user_id: userIdSchema,
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export function validateCreateInspection(body) {
  return parseSchema(createInspectionSchema, body ?? {});
}

export function validateInspectionId(id) {
  return parseSchema(inspectionIdSchema, id);
}
