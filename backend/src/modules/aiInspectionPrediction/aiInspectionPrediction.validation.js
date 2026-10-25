import { z } from 'zod';
import { parseSchema } from '../../utils/validate.js';
import { userIdSchema } from '../user/user.validation.js';
import { DEFECT_TYPES, PHYSICAL_DEFECT_TYPES } from '../../constants/enums.js';
import { inspectionIdSchema } from '../inspection/inspection.validation.js';

export { DEFECT_TYPES, PHYSICAL_DEFECT_TYPES };

export const defectTypeSchema = z.enum(DEFECT_TYPES);
export const physicalDefectTypeSchema = z.enum(PHYSICAL_DEFECT_TYPES);

export const predictionIdSchema = inspectionIdSchema;

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
