function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeUser(user) {
  if (!user) return null;

  const activeRoles = (user.roles ?? [])
    .filter((role) => role.status === 'active')
    .map((role) => role.role)
    .sort();

  const link = user.qualityEngineerLink;
  const supervisor =
    link && link.status === 'active' && link.supervisor
      ? {
          id: link.id,
          supervisor_id: link.supervisorId,
          status: link.status,
          name: link.supervisor.name,
          email: link.supervisor.email,
        }
      : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    created_at: toIso(user.createdAt),
    created_by: user.createdBy,
    updated_at: toIso(user.updatedAt),
    updated_by: user.updatedBy,
    roles: activeRoles,
    supervisor,
  };
}

export function serializeUserRole(role) {
  if (!role) return null;

  return {
    id: role.id,
    user_id: role.userId,
    role: role.role,
    status: role.status,
    created_at: toIso(role.createdAt),
    created_by: role.createdBy,
    updated_at: toIso(role.updatedAt),
    updated_by: role.updatedBy,
    user_name: role.user?.name,
    user_email: role.user?.email,
  };
}

export function serializeUserSupervisor(link) {
  if (!link) return null;

  return {
    id: link.id,
    user_id: link.userId,
    supervisor_id: link.supervisorId,
    status: link.status,
    created_at: toIso(link.createdAt),
    created_by: link.createdBy,
    updated_at: toIso(link.updatedAt),
    updated_by: link.updatedBy,
  };
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
    status: product.status,
    created_at: toIso(product.createdAt),
    created_by: product.createdBy,
    updated_at: toIso(product.updatedAt),
    updated_by: product.updatedBy,
    batch_number: product.batch?.batchNumber,
    sku_name: product.batch?.sku?.name,
    manufacturing_unit_name: product.batch?.manufacturingUnit?.name,
  };
}

export function isPrismaKnownError(err, code) {
  return Boolean(err && err.code === code);
}

export const userListInclude = {
  roles: true,
  qualityEngineerLink: {
    include: {
      supervisor: true,
    },
  },
};
