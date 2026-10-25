import { ApiError, mapPrismaError } from '../../utils/apiError.js';
import { parsePagination, toPage } from '../../utils/pagination.js';
import { serializeSku } from './sku.serializer.js';
import * as skuRepository from './sku.repository.js';

export async function listSkus(query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await skuRepository.findAllSkus({ skip, take });
  return toPage({
    items: items.map(serializeSku),
    page,
    limit,
    total,
  });
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
