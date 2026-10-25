import { describe, expect, it } from 'vitest';
import {
  collectPendingPredictions,
  formatDisplayDate,
  hasProcessingAiRun,
  isOutOfCreditsError,
} from './inspectionDetailHelpers.js';

describe('collectPendingPredictions', () => {
  it('returns only pending predictions with ai run metadata', () => {
    const inspection = {
      ai_inspections: [
        {
          id: 10,
          image_url: '/uploads/inspections/a.jpg',
          predictions: [
            { id: 1, status: 'pending', ai_defect_type: 'dent' },
            { id: 2, status: 'approved', ai_defect_type: 'scratch' },
          ],
        },
        {
          id: 11,
          image_url: '/uploads/inspections/b.jpg',
          predictions: [{ id: 3, status: 'pending', ai_defect_type: 'paint_issue' }],
        },
      ],
    };

    expect(collectPendingPredictions(inspection)).toEqual([
      {
        id: 1,
        status: 'pending',
        ai_defect_type: 'dent',
        ai_inspection_id: 10,
        image_url: '/uploads/inspections/a.jpg',
      },
      {
        id: 3,
        status: 'pending',
        ai_defect_type: 'paint_issue',
        ai_inspection_id: 11,
        image_url: '/uploads/inspections/b.jpg',
      },
    ]);
  });

  it('returns an empty list when there are no AI runs', () => {
    expect(collectPendingPredictions(null)).toEqual([]);
    expect(collectPendingPredictions({})).toEqual([]);
  });
});

describe('hasProcessingAiRun', () => {
  it('detects a processing AI run', () => {
    expect(
      hasProcessingAiRun({
        ai_inspections: [
          { id: 1, status: 'completed' },
          { id: 2, status: 'processing' },
        ],
      })
    ).toBe(true);
  });

  it('is false when nothing is processing', () => {
    expect(hasProcessingAiRun({ ai_inspections: [{ id: 1, status: 'error' }] })).toBe(false);
    expect(hasProcessingAiRun(null)).toBe(false);
  });
});

describe('isOutOfCreditsError', () => {
  it('matches out_of_credits code or message', () => {
    expect(isOutOfCreditsError({ raw_response: { code: 'out_of_credits' } })).toBe(true);
    expect(isOutOfCreditsError({ raw_response: { error: 'Out of credits' } })).toBe(true);
  });

  it('rejects other vision errors', () => {
    expect(isOutOfCreditsError({ raw_response: { code: 'vision_error' } })).toBe(false);
    expect(isOutOfCreditsError({})).toBe(false);
    expect(isOutOfCreditsError(null)).toBe(false);
  });
});

describe('formatDisplayDate', () => {
  it('formats YYYY-MM-DD as DD/MM/YYYY', () => {
    expect(formatDisplayDate('2026-10-25')).toBe('25/10/2026');
    expect(formatDisplayDate('2026-10-25T12:00:00.000Z')).toBe('25/10/2026');
  });

  it('returns em dash for empty values and passthrough for invalid shapes', () => {
    expect(formatDisplayDate(null)).toBe('—');
    expect(formatDisplayDate('')).toBe('—');
    expect(formatDisplayDate('25/10/2026')).toBe('25/10/2026');
  });
});
