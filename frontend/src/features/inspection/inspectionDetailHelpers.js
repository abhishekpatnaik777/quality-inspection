export function collectPendingPredictions(inspection) {
  const pending = [];
  for (const ai of inspection?.ai_inspections ?? []) {
    for (const prediction of ai.predictions ?? []) {
      if (prediction.status === 'pending') {
        pending.push({ ...prediction, ai_inspection_id: ai.id, image_url: ai.image_url });
      }
    }
  }
  return pending;
}

export function hasProcessingAiRun(inspection) {
  return (inspection?.ai_inspections ?? []).some((ai) => ai.status === 'processing');
}

export function isOutOfCreditsError(ai) {
  const code = ai?.raw_response?.code;
  const message = ai?.raw_response?.error;
  return code === 'out_of_credits' || message === 'Out of credits';
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}
