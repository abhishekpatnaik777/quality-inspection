export const ALLOWED_STATUSES = ['pending', 'passed', 'failed'];

export function validateCreateItem(body) {
  const { name, status = 'pending', notes = null } = body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'name is required', statusCode: 400 };
  }

  if (status != null && !ALLOWED_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      statusCode: 400,
    };
  }

  return {
    ok: true,
    value: {
      name: name.trim(),
      status,
      notes: notes ?? null,
    },
  };
}

export function validateUpdateItem(body) {
  const { name, status, notes } = body ?? {};

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return { ok: false, error: 'name must be a non-empty string', statusCode: 400 };
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      statusCode: 400,
    };
  }

  return {
    ok: true,
    value: {
      name: name === undefined ? null : name.trim(),
      status: status === undefined ? null : status,
      notes: notes === undefined ? null : notes,
    },
  };
}
