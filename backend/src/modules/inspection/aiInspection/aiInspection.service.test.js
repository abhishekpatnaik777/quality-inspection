import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ApiError } from '../../../utils/apiError.js';

const expireStaleProcessingAiInspections = mock.fn(async () => undefined);
const createAiInspection = mock.fn();
const completeAiInspectionWithPredictions = mock.fn();
const markAiInspectionError = mock.fn();
const findInspectionRecord = mock.fn();

mock.module('../inspection.repository.js', {
  namedExports: {
    findInspectionRecord: (...args) => findInspectionRecord(...args),
    findInspectionByIdWithClient: async () => null,
    refreshInspectionOutcome: async () => null,
  },
});

mock.module('./aiInspection.repository.js', {
  namedExports: {
    expireStaleProcessingAiInspections: (...args) => expireStaleProcessingAiInspections(...args),
    createAiInspection: (...args) => createAiInspection(...args),
    completeAiInspectionWithPredictions: (...args) => completeAiInspectionWithPredictions(...args),
    markAiInspectionError: (...args) => markAiInspectionError(...args),
  },
});

mock.module('./vision.service.js', {
  namedExports: {
    predictDefectFromImage: async () => {
      throw new Error('vision should not run inline');
    },
    VisionError: class VisionError extends Error {},
  },
});

const { runAiInspection } = await import('./aiInspection.service.js');

describe('runAiInspection', () => {
  it('returns 404 when inspection is missing', async () => {
    findInspectionRecord.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => runAiInspection({ inspectionId: 1, filename: 'a.jpg' }),
      (err) => err instanceof ApiError && err.statusCode === 404
    );
  });

  it('rejects finalized inspections', async () => {
    findInspectionRecord.mock.mockImplementation(async () => ({
      id: 1,
      status: 'pass',
    }));
    await assert.rejects(
      () => runAiInspection({ inspectionId: 1, filename: 'a.jpg' }),
      (err) => err.statusCode === 400
    );
  });

  it('returns a processing payload without running vision inline', async () => {
    findInspectionRecord.mock.mockImplementation(async () => ({
      id: 1,
      status: 'pending',
    }));
    createAiInspection.mock.mockImplementation(async () => ({
      id: 9,
      inspectionId: 1,
      imageUrl: '/uploads/inspections/a.jpg',
      status: 'processing',
      rawResponse: null,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      createdBy: 3,
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedBy: 3,
      predictions: [],
    }));

    const immediate = globalThis.setImmediate;
    globalThis.setImmediate = () => {};
    try {
      const result = await runAiInspection({
        inspectionId: 1,
        filename: 'a.jpg',
        createdBy: 3,
        updatedBy: 3,
      });
      assert.match(result.message, /started/i);
      assert.equal(result.ai_inspection.status, 'processing');
      assert.deepEqual(result.predictions, []);
    } finally {
      globalThis.setImmediate = immediate;
    }
  });
});
