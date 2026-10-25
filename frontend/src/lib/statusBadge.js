export function inspectionStatusBadge(status) {
  switch (status) {
    case 'pass':
      return 'badge badge-ok';
    case 'fail':
      return 'badge badge-bad';
    case 'pending':
      return 'badge badge-warn';
    default:
      return 'badge badge-neutral';
  }
}

export function aiInspectionStatusBadge(status) {
  switch (status) {
    case 'completed':
      return 'badge badge-ok';
    case 'awaiting_verification':
      return 'badge badge-warn';
    case 'processing':
      return 'badge badge-info';
    case 'error':
      return 'badge badge-bad';
    default:
      return 'badge badge-neutral';
  }
}

export function predictionStatusBadge(status) {
  switch (status) {
    case 'approved':
      return 'badge badge-ok';
    case 'overridden':
      return 'badge badge-info';
    case 'pending':
      return 'badge badge-warn';
    default:
      return 'badge badge-neutral';
  }
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
