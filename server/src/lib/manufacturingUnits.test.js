import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateManufacturingUnit } from './manufacturingUnits.js';

describe('validateCreateManufacturingUnit', () => {
  it('requires name, location, and positive capacity', () => {
    assert.equal(validateCreateManufacturingUnit({}).ok, false);
    assert.equal(
      validateCreateManufacturingUnit({
        name: 'Plant 1',
        location: 'Pune',
        capacity: 0,
      }).ok,
      false
    );
  });

  it('accepts a valid unit', () => {
    const result = validateCreateManufacturingUnit({
      name: 'Plant 1',
      location: 'Pune',
      capacity: 25,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.capacity, 25);
  });
});
