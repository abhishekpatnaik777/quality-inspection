function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
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
