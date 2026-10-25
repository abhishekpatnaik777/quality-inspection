import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { serializeSku } from './sku.serializer.js';
import * as skuRepository from './sku.repository.js';

export async function listSkus() {
  const skus = await skuRepository.findAllSkus();
  return skus.map(serializeSku);
}

export async function getSku(id) {
  const sku = await skuRepository.findSkuById(id);
  if (!sku) {
    throw new ApiError(404, 'SKU not found');
  }
  return serializeSku(sku);
}

export async function createSku(payload) {
  try {
    const sku = await skuRepository.createSku(payload);
    return serializeSku(sku);
  } catch (err) {
    mapPrismaError(err, {
      P2002: {
        statusCode: 409,
        message: 'SKU with this category and model already exists',
      },
    });
  }
}
