export const DEFECT_TYPES = [
  { value: 'scratch', label: 'Scratch' },
  { value: 'dent', label: 'Dent' },
  { value: 'paint_issue', label: 'Paint Issue' },
  { value: 'missing_component', label: 'Missing Component' },
  { value: 'no_defect', label: 'No defect' },
];

export const INSPECTION_STATUS_LABELS = {
  pending: 'Pending',
  pass: 'Pass',
  fail: 'Fail',
};

export const AI_INSPECTION_STATUS_LABELS = {
  processing: 'Processing',
  awaiting_verification: 'Awaiting Verification',
  completed: 'Completed',
  error: 'Error',
};

export const PREDICTION_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  overridden: 'Overridden',
};

export function defectLabel(value) {
  return DEFECT_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function inspectionStatusLabel(value) {
  return INSPECTION_STATUS_LABELS[value] ?? value;
}

export function aiInspectionStatusLabel(value) {
  return AI_INSPECTION_STATUS_LABELS[value] ?? value;
}

export function predictionStatusLabel(value) {
  return PREDICTION_STATUS_LABELS[value] ?? value;
}
