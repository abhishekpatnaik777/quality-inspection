import { z } from 'zod';
import { parseSchema } from '../../utils/validate.js';
import { SKU_CATEGORIES } from '../../constants/enums.js';
import { userIdSchema } from '../user/user.validation.js';

export { SKU_CATEGORIES };

export const skuCategorySchema = z.enum(SKU_CATEGORIES);

export const skuIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const createSkuSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255),
  category: skuCategorySchema,
  model: z.string().trim().min(1, 'model is required').max(255),
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export function validateCreateSku(body) {
  return parseSchema(createSkuSchema, body ?? {});
}
