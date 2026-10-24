import { z } from 'zod';
import { parseSchema } from './validate.js';
import { skuIdSchema } from './skus.js';
import { manufacturingUnitIdSchema } from './manufacturingUnits.js';
import { userIdSchema } from './users.js';

export const PRODUCT_STATUSES = ['usable', 'damaged'];

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

export function buildBatchNumber({ skuId, manufacturingUnitId }) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `B-${skuId}-${manufacturingUnitId}-${stamp}-${suffix}`;
}
