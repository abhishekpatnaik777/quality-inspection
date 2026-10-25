import { z } from 'zod';
import { parseSchema } from '../../utils/validate.js';
import { skuIdSchema } from '../sku/sku.validation.js';
import { manufacturingUnitIdSchema } from '../manufacturingUnit/manufacturingUnit.validation.js';
import { userIdSchema } from '../user/user.validation.js';

export const generateProductsSchema = z.object({
  sku_id: skuIdSchema,
  manufacturing_unit_id: manufacturingUnitIdSchema,
  manufacturing_date: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : new Date()))
    .refine((date) => !Number.isNaN(date.getTime()), 'manufacturing_date must be a valid date'),
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export function validateGenerateProducts(body) {
  return parseSchema(generateProductsSchema, body ?? {});
}
