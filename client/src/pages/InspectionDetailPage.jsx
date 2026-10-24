import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import {
  AI_INSPECTION_STATUS_LABELS,
  DEFECT_TYPES,
  aiInspectionStatusLabel,
  defectLabel,
  inspectionStatusLabel,
  predictionStatusLabel,
} from '../lib/defects.js';
import { inflightJson } from '../lib/inflightFetch.js';
import {
  aiInspectionStatusBadge,
  inspectionStatusBadge,
  predictionStatusBadge,
} from '../lib/statusBadge.js';

function fetchInspection(id) {
  const url = `/api/inspections/${id}`;
  return inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load inspection' });
}

function collectPendingPredictions(inspection) {
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

function formatDisplayDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function InspectionDetailPage() {
  const { inspectionId } = useParams();
  const { user, isQualityEngineer } = useAuth();
  const engineerId = user?.id;

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingPredictions, setPendingPredictions] = useState([]);
  const [actionById, setActionById] = useState({});
  const [overrideById, setOverrideById] = useState({});
  const [commentById, setCommentById] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);
  const [aiRunStatusFilter, setAiRunStatusFilter] = useState('completed');

  function syncPendingFromInspection(data) {
    const pending = collectPendingPredictions(data);
    setPendingPredictions(pending);
    setActionById((prev) => {
      const next = { ...prev };
      for (const prediction of pending) {
        if (!next[prediction.id]) next[prediction.id] = 'approve';
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    fetchInspection(inspectionId)
      .then((data) => {
        if (cancelled) return;
        setInspection(data);
        syncPendingFromInspection(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load inspection');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  const canUpload = useMemo(
    () => isQualityEngineer && inspection?.status === 'pending' && pendingPredictions.length === 0,
    [isQualityEngineer, inspection, pendingPredictions]
  );

  const canVerify = isQualityEngineer && pendingPredictions.length > 0;

  const predictionHistory = useMemo(() => {
    const rows = [];
    for (const ai of inspection?.ai_inspections ?? []) {
      for (const prediction of ai.predictions ?? []) {
        rows.push({ ...prediction, ai_inspection_id: ai.id });
      }
    }
    return rows;
  }, [inspection]);

  const filteredAiRuns = useMemo(() => {
    const runs = inspection?.ai_inspections ?? [];
    if (!aiRunStatusFilter) return runs;
    return runs.filter((ai) => ai.status === aiRunStatusFilter);
  }, [inspection, aiRunStatusFilter]);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!inspection || !imageFile || !engineerId) return;
    setAnalyzing(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('image', imageFile);
      form.append('created_by', String(engineerId));
      form.append('updated_by', String(engineerId));

      const res = await fetch(`/api/inspections/${inspection.id}/ai-inspections`, {
        method: 'POST',
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = body.error || 'AI analysis failed';
        if (res.status === 429 || message === 'Out of credits') {
          setErrorModal({
            title: 'Out of credits',
            message: 'Out of credits',
          });
          return;
        }
        throw new Error(message);
      }

      const ai = body.ai_inspection;
      const nextInspection = {
        ...inspection,
        ai_inspections: [
          ...(inspection.ai_inspections || []).filter((item) => item.id !== ai.id),
          ai,
        ],
      };
      setInspection(nextInspection);
      syncPendingFromInspection(nextInspection);
      setImageFile(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function closeErrorModal() {
    setErrorModal(null);
  }

  async function submitVerification(prediction) {
    if (!inspection || !engineerId) return;
    const action = actionById[prediction.id] || 'approve';
    if (action === 'override' && !overrideById[prediction.id]) {
      setActionError('Select a defect type to override with.');
      return;
    }

    setVerifyingId(prediction.id);
    setActionError(null);
    try {
      const payload = {
        action,
        comment: (commentById[prediction.id] || '').trim() || null,
        verified_by: engineerId,
        updated_by: engineerId,
      };
      if (action === 'override') {
        payload.final_defect_type = overrideById[prediction.id];
      }

      const res = await fetch(
        `/api/inspections/${inspection.id}/predictions/${prediction.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save verification');

      setInspection(body.inspection);
      syncPendingFromInspection(body.inspection);
      setCommentById((prev) => {
        const next = { ...prev };
        delete next[prediction.id];
        return next;
      });
      setOverrideById((prev) => {
        const next = { ...prev };
        delete next[prediction.id];
        return next;
      });
      setActionById((prev) => {
        const next = { ...prev };
        delete next[prediction.id];
        return next;
      });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <h1>Inspection #{inspectionId}</h1>
            {inspection && (
              <span className={inspectionStatusBadge(inspection.status)}>
                {inspectionStatusLabel(inspection.status)}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {errorModal && (
        <div className="modal-backdrop" role="presentation" onClick={closeErrorModal}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vision-error-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="vision-error-title">{errorModal.title}</h2>
            </div>
            <p className="error modal-error-message">{errorModal.message}</p>
            <div className="modal-actions">
              <button type="button" className="primary-btn" onClick={closeErrorModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="loading-state">Loading inspection…</p>
      ) : !inspection ? null : (
        <>
          <dl className="summary-grid">
            <div className="summary-item">
              <dt>Date</dt>
              <dd>{formatDisplayDate(inspection.inspection_date)}</dd>
            </div>
            <div className="summary-item">
              <dt>SKU</dt>
              <dd>{inspection.product?.sku_name ?? '—'}</dd>
            </div>
            <div className="summary-item">
              <dt>Product</dt>
              <dd>#{inspection.product_id}</dd>
            </div>
            <div className="summary-item">
              <dt>Batch</dt>
              <dd>{inspection.product?.batch_number ?? '—'}</dd>
            </div>
            <div className="summary-item">
              <dt>Mfg unit</dt>
              <dd>{inspection.product?.manufacturing_unit_name ?? '—'}</dd>
            </div>
          </dl>

          {canUpload && (
            <section className="page-section">
              <h2>Upload photo</h2>
              <div className="card page-narrow">
                <form className="form-stack" onSubmit={handleAnalyze}>
                  <label>
                    Unit photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                      required
                      disabled={analyzing}
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={analyzing || !imageFile}
                    >
                      {analyzing ? 'Analyzing with AI…' : 'Upload & analyze'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {canVerify && (
            <section className="page-section">
              <h2>Needs verification ({pendingPredictions.length})</h2>
              <div className="verify-list">
                {pendingPredictions.map((prediction) => {
                  const verifying = verifyingId === prediction.id;
                  const action = actionById[prediction.id] || 'approve';
                  const overrideType = overrideById[prediction.id] || '';
                  const canSave =
                    action === 'approve' || (action === 'override' && Boolean(overrideType));
                  return (
                    <article key={prediction.id} className="verify-card">
                      {prediction.image_url ? (
                        <img
                          className="verify-photo"
                          src={prediction.image_url}
                          alt={`Prediction ${prediction.id}`}
                        />
                      ) : (
                        <div className="verify-photo-placeholder">No image</div>
                      )}
                      <div className="verify-body">
                        <p>
                          <strong>{defectLabel(prediction.ai_defect_type)}</strong>
                        </p>
                        <p className="muted">
                          <strong>Confidence {Number(prediction.confidence).toFixed(4)}</strong>
                        </p>

                        <fieldset className="verify-action-fieldset" disabled={verifying}>
                          <legend>Decision</legend>
                          <div className="verify-action-options">
                            <label className="verify-action-option">
                              <input
                                type="radio"
                                name={`decision-${prediction.id}`}
                                value="approve"
                                checked={action === 'approve'}
                                onChange={() =>
                                  setActionById((prev) => ({
                                    ...prev,
                                    [prediction.id]: 'approve',
                                  }))
                                }
                              />
                              Approve
                            </label>
                            <label className="verify-action-option">
                              <input
                                type="radio"
                                name={`decision-${prediction.id}`}
                                value="override"
                                checked={action === 'override'}
                                onChange={() =>
                                  setActionById((prev) => ({
                                    ...prev,
                                    [prediction.id]: 'override',
                                  }))
                                }
                              />
                              Override
                            </label>
                          </div>
                        </fieldset>

                        <div className="form-stack">
                          {action === 'override' && (
                            <>
                              <label>
                                Defect type
                                <select
                                  value={overrideType}
                                  onChange={(e) =>
                                    setOverrideById((prev) => ({
                                      ...prev,
                                      [prediction.id]: e.target.value,
                                    }))
                                  }
                                  required
                                  disabled={verifying}
                                >
                                  <option value="" disabled>
                                    Select defect type
                                  </option>
                                  {DEFECT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Comments
                                <textarea
                                  rows={2}
                                  value={commentById[prediction.id] || ''}
                                  onChange={(e) =>
                                    setCommentById((prev) => ({
                                      ...prev,
                                      [prediction.id]: e.target.value,
                                    }))
                                  }
                                  disabled={verifying}
                                  placeholder="Optional notes"
                                />
                              </label>
                            </>
                          )}

                          <div className="form-actions">
                            <button
                              type="button"
                              className="primary-btn"
                              disabled={verifying || !canSave}
                              onClick={() => submitVerification(prediction)}
                            >
                              {verifying ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {inspection.ai_inspections?.length > 0 && (
            <section className="page-section">
              <div className="section-header-row">
                <h2>AI runs</h2>
                <label className="inline-filter">
                  Status
                  <select
                    value={aiRunStatusFilter}
                    onChange={(e) => setAiRunStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {Object.entries(AI_INSPECTION_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filteredAiRuns.length === 0 ? (
                <p className="muted">No AI runs match this status.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Status</th>
                        <th>Predictions</th>
                        <th>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAiRuns.map((ai) => (
                        <tr key={ai.id}>
                          <td>
                            <strong>#{ai.id}</strong>
                          </td>
                          <td>
                            <span className={aiInspectionStatusBadge(ai.status)}>
                              {aiInspectionStatusLabel(ai.status)}
                            </span>
                          </td>
                          <td className="cell-muted">{ai.predictions?.length || 0}</td>
                          <td className="cell-muted">
                            {ai.image_url ? (
                              <a href={ai.image_url} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {predictionHistory.length > 0 && (
            <section className="page-section">
              <h2>Prediction history</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>AI inspection</th>
                      <th>AI prediction</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Final defect</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionHistory.map((prediction) => (
                      <tr key={prediction.id}>
                        <td>
                          <strong>#{prediction.id}</strong>
                        </td>
                        <td className="cell-muted">#{prediction.ai_inspection_id}</td>
                        <td>{defectLabel(prediction.ai_defect_type)}</td>
                        <td className="cell-muted">{Number(prediction.confidence).toFixed(4)}</td>
                        <td>
                          <span className={predictionStatusBadge(prediction.status)}>
                            {predictionStatusLabel(prediction.status)}
                          </span>
                        </td>
                        <td className="cell-muted">
                          {prediction.status === 'pending'
                            ? 'Pending'
                            : defectLabel(prediction.final_defect_type)}
                        </td>
                        <td className="cell-muted">{prediction.comment?.trim() || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
