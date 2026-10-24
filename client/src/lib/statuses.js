export const STATUSES = ['pending', 'passed', 'failed'];

export function isValidStatus(status) {
  return STATUSES.includes(status);
}
