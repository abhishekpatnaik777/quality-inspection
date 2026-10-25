import { describe, expect, it } from 'vitest';
import {
  AI_INSPECTION_STATUS_LABELS,
  DEFECT_TYPES,
  INSPECTION_STATUS_LABELS,
  PREDICTION_STATUS_LABELS,
  aiInspectionStatusLabel,
  defectLabel,
  inspectionStatusLabel,
  predictionStatusLabel,
} from './defects.js';

describe('defects labels', () => {
  it('lists expected defect types', () => {
    expect(DEFECT_TYPES.map((item) => item.value)).toEqual([
      'scratch',
      'dent',
      'paint_issue',
      'missing_component',
      'no_defect',
    ]);
  });

  it('formats defect labels and falls back for unknown values', () => {
    expect(defectLabel('scratch')).toBe('Scratch');
    expect(defectLabel('paint_issue')).toBe('Paint Issue');
    expect(defectLabel('unknown_defect')).toBe('unknown_defect');
  });

  it('formats inspection status labels', () => {
    expect(INSPECTION_STATUS_LABELS.pending).toBe('Pending');
    expect(inspectionStatusLabel('pass')).toBe('Pass');
    expect(inspectionStatusLabel('fail')).toBe('Fail');
    expect(inspectionStatusLabel('weird')).toBe('weird');
  });

  it('formats AI inspection status labels', () => {
    expect(AI_INSPECTION_STATUS_LABELS.processing).toBe('Processing');
    expect(aiInspectionStatusLabel('awaiting_verification')).toBe('Awaiting Verification');
    expect(aiInspectionStatusLabel('error')).toBe('Error');
    expect(aiInspectionStatusLabel('unknown')).toBe('unknown');
  });

  it('formats prediction status labels', () => {
    expect(PREDICTION_STATUS_LABELS.pending).toBe('Pending');
    expect(predictionStatusLabel('approved')).toBe('Approved');
    expect(predictionStatusLabel('overridden')).toBe('Overridden');
    expect(predictionStatusLabel('other')).toBe('other');
  });
});
