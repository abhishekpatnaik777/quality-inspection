export function formatZodError(error) {
  return error.issues.map((issue) => issue.message).join('; ');
}

export function parseSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      error: formatZodError(result.error),
      statusCode: 400,
    };
  }
  return { ok: true, value: result.data };
}
