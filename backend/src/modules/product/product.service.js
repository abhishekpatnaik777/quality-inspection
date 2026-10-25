import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { serializeBatch, serializeProduct } from './product.serializer.js';
import * as productRepository from './product.repository.js';

export function buildBatchNumber({ skuId, manufacturingUnitId }) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `B-${skuId}-${manufacturingUnitId}-${stamp}-${suffix}`;
}

export async function listProducts() {
  const products = await productRepository.findAllProducts();
  return products.map(serializeProduct);
}

export async function generateProducts(payload) {
  const { sku_id, manufacturing_unit_id, manufacturing_date, created_by, updated_by } = payload;

  const { sku, unit } = await productRepository.findSkuAndUnit(sku_id, manufacturing_unit_id);

  if (!sku) {
    throw new ApiError(404, 'SKU not found');
  }
  if (!unit) {
    throw new ApiError(404, 'Manufacturing unit not found');
  }
  if (unit.capacity < 1) {
    throw new ApiError(400, 'Manufacturing unit capacity must be at least 1');
  }

  const batchNumber = buildBatchNumber({
    skuId: sku.id,
    manufacturingUnitId: unit.id,
  });

  try {
    const result = await productRepository.createBatchWithProducts({
      batchNumber,
      sku,
      unit,
      manufacturingDate: manufacturing_date,
      createdBy: created_by,
      updatedBy: updated_by,
    });

    return {
      message: `Generating ${unit.capacity} ${sku.name} with a unique batch Id.`,
      capacity: unit.capacity,
      sku_name: sku.name,
      batch: serializeBatch(result.batch),
      products_created: result.products.length,
      products: result.products.map(serializeProduct),
    };
  } catch (err) {
    mapPrismaError(err, {
      P2002: { statusCode: 409, message: 'batch number collision, please retry' },
      P2003: {
        statusCode: 400,
        message: 'Invalid SKU, manufacturing unit, or audit user',
      },
    });
  }
}
