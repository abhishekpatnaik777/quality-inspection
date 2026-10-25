import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ApiError } from '../../utils/apiError.js';

const findSkuAndUnit = mock.fn();
const createBatchWithProducts = mock.fn();
const findAllProducts = mock.fn();

mock.module('./product.repository.js', {
  namedExports: {
    findSkuAndUnit: (...args) => findSkuAndUnit(...args),
    createBatchWithProducts: (...args) => createBatchWithProducts(...args),
    findAllProducts: (...args) => findAllProducts(...args),
    findProductById: async () => null,
  },
});

const { buildBatchNumber, generateProducts } = await import('./product.service.js');

describe('buildBatchNumber', () => {
  it('includes sku and unit ids', () => {
    const value = buildBatchNumber({ skuId: 3, manufacturingUnitId: 9 });
    assert.match(value, /^B-3-9-/);
  });
});

describe('generateProducts', () => {
  it('returns 404 when sku is missing', async () => {
    findSkuAndUnit.mock.mockImplementation(async () => ({
      sku: null,
      unit: { id: 2, capacity: 2 },
    }));
    await assert.rejects(
      () =>
        generateProducts({
          sku_id: 1,
          manufacturing_unit_id: 2,
          manufacturing_date: new Date(),
        }),
      (err) => err instanceof ApiError && err.statusCode === 404
    );
  });

  it('returns 404 when unit is missing', async () => {
    findSkuAndUnit.mock.mockImplementation(async () => ({
      sku: { id: 1, name: 'Pad' },
      unit: null,
    }));
    await assert.rejects(
      () =>
        generateProducts({
          sku_id: 1,
          manufacturing_unit_id: 2,
          manufacturing_date: new Date(),
        }),
      (err) => err instanceof ApiError && err.statusCode === 404 && /unit/i.test(err.message)
    );
  });

  it('rejects capacity below 1', async () => {
    findSkuAndUnit.mock.mockImplementation(async () => ({
      sku: { id: 1, name: 'Pad' },
      unit: { id: 2, capacity: 0 },
    }));
    await assert.rejects(
      () =>
        generateProducts({
          sku_id: 1,
          manufacturing_unit_id: 2,
          manufacturing_date: new Date(),
        }),
      (err) => err.statusCode === 400
    );
  });

  it('returns created product count on success', async () => {
    const sku = { id: 1, name: 'Pad' };
    const unit = { id: 2, capacity: 2, name: 'Plant' };
    findSkuAndUnit.mock.mockImplementation(async () => ({ sku, unit }));
    createBatchWithProducts.mock.mockImplementation(async () => ({
      batch: {
        id: 9,
        batchNumber: 'B-1-2-x',
        manufacturingUnitId: 2,
        skuId: 1,
        manufacturingDate: new Date('2025-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedBy: null,
        sku,
        manufacturingUnit: unit,
      },
      products: [
        {
          id: 1,
          batchId: 9,
          createdAt: new Date(),
          createdBy: null,
          updatedAt: new Date(),
          updatedBy: null,
          batch: {
            batchNumber: 'B-1-2-x',
            skuId: 1,
            manufacturingUnitId: 2,
            sku,
            manufacturingUnit: unit,
          },
        },
        {
          id: 2,
          batchId: 9,
          createdAt: new Date(),
          createdBy: null,
          updatedAt: new Date(),
          updatedBy: null,
          batch: {
            batchNumber: 'B-1-2-x',
            skuId: 1,
            manufacturingUnitId: 2,
            sku,
            manufacturingUnit: unit,
          },
        },
      ],
    }));

    const result = await generateProducts({
      sku_id: 1,
      manufacturing_unit_id: 2,
      manufacturing_date: new Date(),
    });
    assert.equal(result.products_created, 2);
    assert.equal(result.capacity, 2);
  });
});
