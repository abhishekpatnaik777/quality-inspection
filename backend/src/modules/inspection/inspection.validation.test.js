import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfidence,
  normalizeDefectType,
  validateCreateInspection,
  validateVerifyPrediction,
} from './inspection.validation.js';
import { finalizePredictions } from './vision.service.js';

describe('normalizeDefectType', () => {
  it('accepts exact enum values', () => {
    assert.equal(normalizeDefectType('scratch').defectType, 'scratch');
    assert.equal(normalizeDefectType('no_defect').defectType, 'no_defect');
  });

  it('maps aliases and free text', () => {
    assert.equal(normalizeDefectType('Paint Issue').defectType, 'paint_issue');
    assert.equal(normalizeDefectType('dents').defectType, 'dent');
    assert.equal(normalizeDefectType('OK').defectType, 'no_defect');
  });

  it('falls back for unsupported categories', () => {
    const result = normalizeDefectType('crack');
    assert.equal(result.defectType, 'no_defect');
    assert.equal(result.reason, 'unsupported_fallback');
  });
});

describe('normalizeConfidence', () => {
  it('clamps and rounds to 4 decimals', () => {
    assert.equal(normalizeConfidence(0.83333), 0.8333);
    assert.equal(normalizeConfidence(1.5), 1);
    assert.equal(normalizeConfidence('bad'), 0);
  });
});

describe('validateCreateInspection', () => {
  it('requires product_id and user_id', () => {
    const result = validateCreateInspection({});
    assert.equal(result.ok, false);
  });

  it('accepts a valid payload', () => {
    const result = validateCreateInspection({ product_id: 1, user_id: 2 });
    assert.equal(result.ok, true);
  });
});

describe('validateVerifyPrediction', () => {
  it('requires final_defect_type on override', () => {
    const result = validateVerifyPrediction({
      action: 'override',
      verified_by: 1,
    });
    assert.equal(result.ok, false);
  });

  it('accepts approve without final_defect_type', () => {
    const result = validateVerifyPrediction({
      action: 'approve',
      verified_by: 1,
      comment: 'looks right',
    });
    assert.equal(result.ok, true);
  });
});

describe('finalizePredictions', () => {
  it('keeps multiple distinct defects', () => {
    const result = finalizePredictions({
      predictions: [
        { predicted_defect_type: 'dent', confidence: 0.83 },
        { predicted_defect_type: 'scratch', confidence: 0.71 },
      ],
    });
    assert.equal(result.predictions.length, 2);
    assert.deepEqual(result.predictions.map((item) => item.aiDefectType).sort(), [
      'dent',
      'scratch',
    ]);
  });

  it('dedupes the same defect type by higher confidence', () => {
    const result = finalizePredictions({
      predictions: [
        { predicted_defect_type: 'dent', confidence: 0.4 },
        { predicted_defect_type: 'dent', confidence: 0.9 },
      ],
    });
    assert.equal(result.predictions.length, 1);
    assert.equal(result.predictions[0].confidence, 0.9);
  });
});
