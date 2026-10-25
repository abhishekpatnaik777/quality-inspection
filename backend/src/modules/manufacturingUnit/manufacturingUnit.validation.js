import { z } from 'zod';
import { parseSchema } from '../../utils/validate.js';
import { userIdSchema } from '../user/user.validation.js';

export const manufacturingUnitIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const createManufacturingUnitSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255),
  location: z.string().trim().min(1, 'location is required').max(255),
  capacity: z.coerce
    .number({ invalid_type_error: 'capacity must be a number' })
    .int('capacity must be an integer')
    .positive('capacity must be a positive integer')
    .max(100000, 'capacity is too large'),
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export function validateCreateManufacturingUnit(body) {
  return parseSchema(createManufacturingUnitSchema, body ?? {});
}
