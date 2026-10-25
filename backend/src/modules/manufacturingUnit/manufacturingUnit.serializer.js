function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeManufacturingUnit(unit) {
  if (!unit) return null;
  return {
    id: unit.id,
    name: unit.name,
    location: unit.location,
    capacity: unit.capacity,
    created_at: toIso(unit.createdAt),
    created_by: unit.createdBy,
    updated_at: toIso(unit.updatedAt),
    updated_by: unit.updatedBy,
  };
}
