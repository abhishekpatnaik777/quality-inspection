import { describe, expect, it } from 'vitest';
import { USER_ROLE_VALUES, isValidUserRole, roleLabel } from './userLabels.js';

describe('user role enums', () => {
  it('only allows quality_engineer and supervisor', () => {
    expect(USER_ROLE_VALUES).toEqual(['quality_engineer', 'supervisor']);
    expect(isValidUserRole('quality_engineer')).toBe(true);
    expect(isValidUserRole('supervisor')).toBe(true);
    expect(isValidUserRole('admin')).toBe(false);
  });

  it('formats role labels', () => {
    expect(roleLabel('quality_engineer')).toBe('Quality engineer');
    expect(roleLabel('supervisor')).toBe('Supervisor');
  });
});
