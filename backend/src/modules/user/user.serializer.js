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

export const userListInclude = {
  roles: true,
  qualityEngineerLink: {
    include: {
      supervisor: true,
    },
  },
};
