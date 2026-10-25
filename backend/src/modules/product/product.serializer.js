function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeBatch(batch) {
  if (!batch) return null;
  return {
    id: batch.id,
    batch_number: batch.batchNumber,
    manufacturing_unit_id: batch.manufacturingUnitId,
    sku_id: batch.skuId,
    manufacturing_date: toIso(batch.manufacturingDate)?.slice(0, 10),
    created_at: toIso(batch.createdAt),
    created_by: batch.createdBy,
    updated_at: toIso(batch.updatedAt),
    updated_by: batch.updatedBy,
    sku_name: batch.sku?.name,
    manufacturing_unit_name: batch.manufacturingUnit?.name,
  };
}

export function serializeProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    batch_id: product.batchId,
    created_at: toIso(product.createdAt),
    created_by: product.createdBy,
    updated_at: toIso(product.updatedAt),
    updated_by: product.updatedBy,
    batch_number: product.batch?.batchNumber,
    sku_id: product.batch?.skuId ?? product.batch?.sku?.id,
    sku_name: product.batch?.sku?.name,
    manufacturing_unit_id:
      product.batch?.manufacturingUnitId ?? product.batch?.manufacturingUnit?.id,
    manufacturing_unit_name: product.batch?.manufacturingUnit?.name,
  };
}

export const productListInclude = {
  batch: {
    include: {
      sku: true,
      manufacturingUnit: true,
    },
  },
};
