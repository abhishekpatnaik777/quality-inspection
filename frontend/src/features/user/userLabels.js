export const USER_ROLES = [
  { value: 'quality_engineer', label: 'Quality engineer' },
  { value: 'supervisor', label: 'Supervisor' },
];

export const USER_ROLE_VALUES = USER_ROLES.map((r) => r.value);

export function roleLabel(value) {
  return USER_ROLES.find((r) => r.value === value)?.label ?? value;
}

export function isValidUserRole(role) {
  return USER_ROLE_VALUES.includes(role);
}

export function userStatusBadge(status) {
  switch (status) {
    case 'active':
      return 'badge badge-ok';
    case 'inactive':
      return 'badge badge-neutral';
    case 'invited':
      return 'badge badge-info';
    default:
      return 'badge badge-neutral';
  }
}
