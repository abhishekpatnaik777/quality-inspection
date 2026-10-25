import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../../../config/environment.js', {
  namedExports: {
    env: {
      nodeEnv: 'test',
      port: 4000,
      clientOrigin: 'http://localhost:5173',
      googleAiApiKey: null,
      googleVisionModel: 'gemini-test',
      mockVision: false,
    },
  },
});

const { finalizePredictions, predictDefectFromImage } = await import('./vision.service.js');

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

  it('falls back to a single no_defect prediction for empty input', () => {
    const result = finalizePredictions({ predictions: [] });
    assert.equal(result.predictions.length, 1);
    assert.equal(result.predictions[0].aiDefectType, 'no_defect');
  });
});

describe('predictDefectFromImage', () => {
  it('returns the mock pair when no API key is configured', async () => {
    const result = await predictDefectFromImage('/tmp/unused.jpg');
    assert.equal(result.predictions.length, 2);
    assert.deepEqual(result.predictions.map((item) => item.aiDefectType).sort(), [
      'dent',
      'scratch',
    ]);
    assert.equal(result.rawResponse.mock, true);
  });
});
