import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { formatZodError, parseSchema } from './validate.js';

describe('formatZodError', () => {
  it('joins issue messages', () => {
    const result = z.object({ name: z.string(), age: z.number() }).safeParse({ name: 1, age: 'x' });
    assert.equal(result.success, false);
    const message = formatZodError(result.error);
    assert.match(message, /;/);
  });
});

describe('parseSchema', () => {
  const schema = z.object({
    name: z.string().min(1),
    count: z.coerce.number().int().positive(),
  });

  it('returns ok with parsed value', () => {
    const result = parseSchema(schema, { name: 'Widget', count: '3' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { name: 'Widget', count: 3 });
  });

  it('returns statusCode 400 with joined errors', () => {
    const result = parseSchema(schema, {});
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 400);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length > 0);
  });
});
