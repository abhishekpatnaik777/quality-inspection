import { describe, expect, it } from 'vitest';
import { SKU_CATEGORIES, categoryLabel } from './skuLabels.js';

describe('skuLabels', () => {
  it('lists expected categories', () => {
    expect(SKU_CATEGORIES.map((item) => item.value)).toEqual([
      'electronics',
      'mechanical',
      'consumable',
      'other',
    ]);
  });

  it('formats known category labels and falls back for unknown values', () => {
    expect(categoryLabel('electronics')).toBe('Electronics');
    expect(categoryLabel('mechanical')).toBe('Mechanical');
    expect(categoryLabel('custom')).toBe('custom');
  });
});
