import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { finalizePredictions } from './vision.service.js';

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
