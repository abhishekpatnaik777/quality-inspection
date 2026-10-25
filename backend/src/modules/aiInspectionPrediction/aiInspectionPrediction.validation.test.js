import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfidence,
  normalizeDefectType,
  validateVerifyPrediction,
} from './aiInspectionPrediction.validation.js';

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
