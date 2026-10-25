import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ApiError } from '../../utils/apiError.js';

const findInspections = mock.fn();
const findInspectionById = mock.fn();
const findLatestInspectionByProductAndUser = mock.fn();
const createInspectionRepo = mock.fn();
const findActiveEngineerIds = mock.fn();
const findUsersByIds = mock.fn();
const findLoggedInspections = mock.fn();
const findSkusForEngineers = mock.fn();
const expireStaleProcessingAiInspections = mock.fn(async () => undefined);
const findSummaryFilterRows = mock.fn();
const findSummaryMetricRows = mock.fn();
const findProductById = mock.fn();

mock.module('./inspection.repository.js', {
  namedExports: {
    findInspections: (...args) => findInspections(...args),
    findInspectionById: (...args) => findInspectionById(...args),
    findLatestInspectionByProductAndUser: (...args) =>
      findLatestInspectionByProductAndUser(...args),
    createInspection: (...args) => createInspectionRepo(...args),
    findActiveEngineerIds: (...args) => findActiveEngineerIds(...args),
    findUsersByIds: (...args) => findUsersByIds(...args),
    findLoggedInspections: (...args) => findLoggedInspections(...args),
    findSkusForEngineers: (...args) => findSkusForEngineers(...args),
    findInspectionByIdWithClient: async () => null,
    findInspectionRecord: async () => null,
    refreshInspectionOutcome: async () => null,
  },
});

mock.module('./aiInspection/aiInspection.repository.js', {
  namedExports: {
    expireStaleProcessingAiInspections: (...args) => expireStaleProcessingAiInspections(...args),
  },
});

mock.module('./aiInspectionPrediction/aiInspectionPrediction.repository.js', {
  namedExports: {
    findSummaryFilterRows: (...args) => findSummaryFilterRows(...args),
    findSummaryMetricRows: (...args) => findSummaryMetricRows(...args),
  },
});

mock.module('../product/product.repository.js', {
  namedExports: {
    findProductById: (...args) => findProductById(...args),
  },
});

const {
  getInspection,
  createInspection,
  listSupervisedInspections,
  listOverviewInspections,
  getSupervisedSummary,
  getOverviewSummary,
} = await import('./inspection.service.js');

function baseInspection(overrides = {}) {
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
    product: {
      id: 11,
      batchId: 1,
      createdAt: new Date(),
      createdBy: null,
      updatedAt: new Date(),
      updatedBy: null,
      batch: {
        skuId: 2,
        sku: { id: 2, name: 'Pad' },
        manufacturingUnit: { id: 4, name: 'Plant' },
      },
    },
    aiInspections: [],
    results: [],
    ...overrides,
  };
}

describe('getInspection', () => {
  it('throws 404 when missing', async () => {
    findInspectionById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => getInspection(99),
      (err) => err.statusCode === 404
    );
  });
});

describe('createInspection', () => {
  it('reuses an existing inspection', async () => {
    findProductById.mock.mockImplementation(async () => ({ id: 11 }));
    const existing = baseInspection();
    findLatestInspectionByProductAndUser.mock.mockImplementation(async () => existing);
    const result = await createInspection({ product_id: 11, user_id: 3 });
    assert.equal(result.created, false);
    assert.equal(result.inspection.id, 5);
  });

  it('creates when none exists', async () => {
    findProductById.mock.mockImplementation(async () => ({ id: 11 }));
    findLatestInspectionByProductAndUser.mock.mockImplementation(async () => null);
    createInspectionRepo.mock.mockImplementation(async () => baseInspection({ id: 8 }));
    const result = await createInspection({ product_id: 11, user_id: 3 });
    assert.equal(result.created, true);
    assert.equal(result.inspection.id, 8);
  });
});

describe('listSupervisedInspections', () => {
  it('returns an empty page when the supervisor has no engineers', async () => {
    findActiveEngineerIds.mock.mockImplementation(async () => []);
    const result = await listSupervisedInspections({ supervisor_id: 1 });
    assert.deepEqual(result.items, []);
    assert.equal(result.total, 0);
  });

  it('rejects an invalid defect_type', async () => {
    findActiveEngineerIds.mock.mockImplementation(async () => [3]);
    await assert.rejects(
      () => listSupervisedInspections({ supervisor_id: 1, defect_type: 'crack' }),
      (err) => err instanceof ApiError && err.statusCode === 400
    );
  });

  it('rejects inspectors outside the team', async () => {
    findActiveEngineerIds.mock.mockImplementation(async () => [3]);
    await assert.rejects(
      () => listSupervisedInspections({ supervisor_id: 1, inspector_id: 99 }),
      (err) => err.statusCode === 403
    );
  });
});

describe('listOverviewInspections', () => {
  it('counts physical final defects', async () => {
    findLoggedInspections.mock.mockImplementation(async () => ({
      items: [
        {
          ...baseInspection(),
          aiInspections: [
            {
              predictions: [
                {
                  finalDefectType: 'scratch',
                  status: 'approved',
                  verifiedAt: new Date('2025-06-05T10:00:00.000Z'),
                  updatedAt: new Date('2025-06-05T10:00:00.000Z'),
                },
                {
                  finalDefectType: 'no_defect',
                  status: 'approved',
                  verifiedAt: new Date('2025-06-05T09:00:00.000Z'),
                  updatedAt: new Date('2025-06-05T09:00:00.000Z'),
                },
              ],
            },
          ],
        },
      ],
      total: 1,
    }));

    const result = await listOverviewInspections({ page: 1, limit: 20 });
    assert.equal(result.items[0].total_defects, 1);
    assert.equal(result.items[0].sku_name, 'Pad');
  });
});

describe('getOverviewSummary', () => {
  it('computes rates and puts no_defect last', async () => {
    findSummaryMetricRows.mock.mockImplementation(async () => [
      {
        status: 'approved',
        finalDefectType: 'scratch',
        aiInspection: { inspection: { id: 1, productId: 10 } },
      },
      {
        status: 'overridden',
        finalDefectType: 'dent',
        aiInspection: { inspection: { id: 2, productId: 11 } },
      },
      {
        status: 'approved',
        finalDefectType: 'no_defect',
        aiInspection: { inspection: { id: 3, productId: 12 } },
      },
    ]);

    const { summary } = await getOverviewSummary();
    assert.equal(summary.total_predictions, 3);
    assert.equal(summary.accepted, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.ai_acceptance_rate, 66.7);
    assert.equal(summary.defect_breakdown.at(-1).defect_type, 'no_defect');
  });
});

describe('getSupervisedSummary', () => {
  it('returns empty summary when there are no engineers', async () => {
    findActiveEngineerIds.mock.mockImplementation(async () => []);
    const result = await getSupervisedSummary({ supervisor_id: 1 });
    assert.equal(result.summary.total_inspected, 0);
    assert.deepEqual(result.skus, []);
  });
});
