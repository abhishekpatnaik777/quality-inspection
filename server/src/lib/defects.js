import { z } from 'zod';
import { parseSchema } from './validate.js';
import { userIdSchema } from './users.js';

export const DEFECT_TYPES = ['scratch', 'dent', 'paint_issue', 'missing_component', 'no_defect'];

export const PHYSICAL_DEFECT_TYPES = DEFECT_TYPES.filter((type) => type !== 'no_defect');

export const INSPECTION_STATUSES = ['pending', 'pass', 'fail'];
export const AI_INSPECTION_STATUSES = ['processing', 'awaiting_verification', 'completed', 'error'];
export const PREDICTION_STATUSES = ['pending', 'approved', 'overridden'];

export const defectTypeSchema = z.enum(DEFECT_TYPES);
export const physicalDefectTypeSchema = z.enum(PHYSICAL_DEFECT_TYPES);

export const inspectionIdSchema = z.coerce
  .number({ invalid_type_error: 'id must be a number' })
  .int('id must be an integer')
  .positive('id must be a positive integer');

export const predictionIdSchema = inspectionIdSchema;

export const createInspectionSchema = z.object({
  product_id: inspectionIdSchema,
  user_id: userIdSchema,
  created_by: userIdSchema.nullable().optional().default(null),
  updated_by: userIdSchema.nullable().optional().default(null),
});

export const verifyPredictionSchema = z
  .object({
    action: z.enum(['approve', 'override']),
    final_defect_type: defectTypeSchema.optional(),
    comment: z.string().trim().max(4000).nullable().optional().default(null),
    verified_by: userIdSchema,
    updated_by: userIdSchema.nullable().optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'override' && !value.final_defect_type) {
      ctx.addIssue({
        code: 'custom',
        path: ['final_defect_type'],
        message: 'final_defect_type is required when overriding',
      });
    }
  });

export function validateCreateInspection(body) {
  return parseSchema(createInspectionSchema, body ?? {});
}

export function validateInspectionId(id) {
  return parseSchema(inspectionIdSchema, id);
}

export function validatePredictionId(id) {
  return parseSchema(predictionIdSchema, id);
}

export function validateVerifyPrediction(body) {
  return parseSchema(verifyPredictionSchema, body ?? {});
}

/** Map messy model output into one of the five allowed defect types. */
export function normalizeDefectType(raw) {
  if (raw == null) {
    return { defectType: 'no_defect', normalized: true, reason: 'null_input' };
  }

  const text = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases = {
    scratch: 'scratch',
    scratches: 'scratch',
    dent: 'dent',
    dents: 'dent',
    paint_issue: 'paint_issue',
    paint: 'paint_issue',
    paint_defect: 'paint_issue',
    paintissue: 'paint_issue',
    missing_component: 'missing_component',
    missing: 'missing_component',
    missing_part: 'missing_component',
    no_defect: 'no_defect',
    none: 'no_defect',
    no_defects: 'no_defect',
    ok: 'no_defect',
    pass: 'no_defect',
  };

  if (aliases[text]) {
    return { defectType: aliases[text], normalized: text !== aliases[text], reason: 'alias' };
  }

  if (DEFECT_TYPES.includes(text)) {
    return { defectType: text, normalized: false, reason: 'exact' };
  }

  return { defectType: 'no_defect', normalized: true, reason: 'unsupported_fallback' };
}

export function normalizeConfidence(raw) {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Math.round(num * 10000) / 10000;
}
