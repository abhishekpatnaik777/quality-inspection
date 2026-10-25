export const SKU_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'other', label: 'Other' },
];

export function categoryLabel(value) {
  return SKU_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}
