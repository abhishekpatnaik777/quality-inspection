import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ApiError } from '../../../utils/apiError.js';

const findPredictionWithAiInspection = mock.fn();
const updatePrediction = mock.fn(async () => undefined);
const countPendingForAiInspection = mock.fn(async () => 0);
const markAiInspectionCompleted = mock.fn(async () => undefined);
const createInspectionResult = mock.fn(async () => undefined);
const refreshInspectionOutcome = mock.fn(async () => null);
const findInspectionByIdWithClient = mock.fn();

const fakeTx = {};

mock.module('../../../config/database.js', {
  namedExports: {
    prisma: {
      $transaction: async (fn) => fn(fakeTx),
    },
  },
});

mock.module('./aiInspectionPrediction.repository.js', {
  namedExports: {
    findPredictionWithAiInspection: (...args) => findPredictionWithAiInspection(...args),
    updatePrediction: (...args) => updatePrediction(...args),
    countPendingForAiInspection: (...args) => countPendingForAiInspection(...args),
  },
});

mock.module('../aiInspection/aiInspection.repository.js', {
  namedExports: {
    markAiInspectionCompleted: (...args) => markAiInspectionCompleted(...args),
  },
});

mock.module('../inspectionResult/inspectionResult.repository.js', {
  namedExports: {
    createInspectionResult: (...args) => createInspectionResult(...args),
  },
});

mock.module('../inspection.repository.js', {
  namedExports: {
    refreshInspectionOutcome: (...args) => refreshInspectionOutcome(...args),
    findInspectionByIdWithClient: (...args) => findInspectionByIdWithClient(...args),
  },
});

const { verifyPrediction } = await import('./aiInspectionPrediction.service.js');

function pendingPrediction(overrides = {}) {
  return {
    id: 10,
    aiInspectionId: 4,
    aiDefectType: 'dent',
    status: 'pending',
    aiInspection: { inspectionId: 5, id: 4 },
    ...overrides,
  };
}

function inspectionRow() {
  return {
    id: 5,
    userId: 3,
    productId: 11,
    inspectionDate: new Date('2025-06-04T00:00:00.000Z'),
    status: 'pending',
    createdAt: new Date('2025-06-04T00:00:00.000Z'),
    createdBy: 3,
    updatedAt: new Date('2025-06-04T00:00:00.000Z'),
    updatedBy: 3,
    engineer: { name: 'QE' },
    product: null,
    aiInspections: [],
    results: [],
  };
}

describe('verifyPrediction', () => {
  it('returns 404 when prediction is missing for the inspection', async () => {
    findPredictionWithAiInspection.mock.mockImplementation(async () => null);
    await assert.rejects(
      () =>
        verifyPrediction({
          inspectionId: 5,
          predictionId: 10,
          action: 'approve',
          verified_by: 3,
        }),
      (err) => err instanceof ApiError && err.statusCode === 404
    );
  });

  it('rejects already verified predictions', async () => {
    findPredictionWithAiInspection.mock.mockImplementation(async () =>
      pendingPrediction({ status: 'approved' })
    );
    await assert.rejects(
      () =>
        verifyPrediction({
          inspectionId: 5,
          predictionId: 10,
          action: 'approve',
          verified_by: 3,
        }),
      (err) => err.statusCode === 400
    );
  });

  it('approves using the AI defect type', async () => {
    findPredictionWithAiInspection.mock.mockImplementation(async () => pendingPrediction());
    findInspectionByIdWithClient.mock.mockImplementation(async () => inspectionRow());
    updatePrediction.mock.resetCalls();
    createInspectionResult.mock.resetCalls();

    const result = await verifyPrediction({
      inspectionId: 5,
      predictionId: 10,
      action: 'approve',
      verified_by: 3,
    });

    assert.match(result.message, /approved/i);
    assert.equal(updatePrediction.mock.calls[0].arguments[2].finalDefectType, 'dent');
    assert.equal(createInspectionResult.mock.calls.length, 1);
  });

  it('overrides and creates an inspection result for physical defects', async () => {
    findPredictionWithAiInspection.mock.mockImplementation(async () => pendingPrediction());
    findInspectionByIdWithClient.mock.mockImplementation(async () => inspectionRow());
    createInspectionResult.mock.resetCalls();

    const result = await verifyPrediction({
      inspectionId: 5,
      predictionId: 10,
      action: 'override',
      final_defect_type: 'scratch',
      verified_by: 3,
    });

    assert.match(result.message, /scratch/);
    assert.equal(createInspectionResult.mock.calls[0].arguments[1].defectType, 'scratch');
  });
});
