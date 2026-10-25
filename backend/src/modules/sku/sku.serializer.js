function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeSku(sku) {
  if (!sku) return null;
  return {
    id: sku.id,
    name: sku.name,
    category: sku.category,
    model: sku.model,
    created_at: toIso(sku.createdAt),
    created_by: sku.createdBy,
    updated_at: toIso(sku.updatedAt),
    updated_by: sku.updatedBy,
  };
}
