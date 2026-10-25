import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import {
  DEFECT_TYPES,
  aiInspectionStatusLabel,
  defectLabel,
  inspectionStatusLabel,
  predictionStatusLabel,
} from './defects.js';
import {
  collectPendingPredictions,
  formatDisplayDate,
  hasProcessingAiRun,
  isOutOfCreditsError,
} from './inspectionDetailHelpers.js';
import {
  aiInspectionStatusBadge,
  inspectionStatusBadge,
  predictionStatusBadge,
} from './statusBadge.js';

const AI_POLL_INTERVAL_MS = 2000;

function fetchInspection(id) {
  const url = `/api/inspections/${id}`;
  return inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load inspection' });
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
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const shownVisionErrorIdsRef = useRef(new Set());

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

  function notifyVisionErrors(data) {
    for (const ai of data?.ai_inspections ?? []) {
      if (ai.status !== 'error' || shownVisionErrorIdsRef.current.has(ai.id)) continue;
      shownVisionErrorIdsRef.current.add(ai.id);
      if (isOutOfCreditsError(ai)) {
        setErrorModal({
          title: 'Out of credits',
          message: 'Out of credits',
        });
      } else {
        setActionError('Vision model failed. Photo was saved; retry analysis or inspect manually.');
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetchInspection(inspectionId)
      .then((data) => {
        if (cancelled) return;
        setInspection(data);
        syncPendingFromInspection(data);
        setError(null);
        for (const ai of data?.ai_inspections ?? []) {
          if (ai.status === 'error') {
            shownVisionErrorIdsRef.current.add(ai.id);
          }
        }
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

  const isAiProcessing = useMemo(() => hasProcessingAiRun(inspection), [inspection]);
  const showAnalyzing = analyzing || isAiProcessing;

  useEffect(() => {
    if (!inspectionId || !isAiProcessing) return undefined;

    let cancelled = false;

    async function pollOnce() {
      try {
        const data = await fetchInspection(inspectionId);
        if (cancelled) return;
        setInspection(data);
        syncPendingFromInspection(data);
        if (!hasProcessingAiRun(data)) {
          notifyVisionErrors(data);
        }
      } catch (err) {
        if (cancelled) return;
        setActionError(err.message || 'Failed to refresh inspection');
      }
    }

    pollOnce();
    const intervalId = setInterval(pollOnce, AI_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [inspectionId, isAiProcessing]);

  const canUpload = useMemo(
    () =>
      isQualityEngineer &&
      inspection?.status === 'pending' &&
      pendingPredictions.length === 0 &&
      !isAiProcessing,
    [isQualityEngineer, inspection, pendingPredictions, isAiProcessing]
  );

  const canVerify = isQualityEngineer && pendingPredictions.length > 0;

  const aiSuggestions = inspection?.ai_inspections ?? [];

  const finalDefectsLabel = useMemo(() => {
    const labels = [];
    const seen = new Set();
    for (const ai of inspection?.ai_inspections ?? []) {
      for (const prediction of ai.predictions ?? []) {
        if (prediction.status === 'pending') continue;
        const defectType = prediction.final_defect_type;
        if (!defectType || seen.has(defectType)) continue;
        seen.add(defectType);
        labels.push(defectLabel(defectType));
      }
    }
    return labels.length > 0 ? labels.join(', ') : '—';
  }, [inspection]);

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
          ai,
          ...(inspection.ai_inspections || []).filter((item) => item.id !== ai.id),
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

  function closeSuggestionModal() {
    setSelectedSuggestion(null);
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

      {selectedSuggestion && (
        <div className="modal-backdrop" role="presentation" onClick={closeSuggestionModal}>
          <div
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-suggestion-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="ai-suggestion-title">Analysis #{selectedSuggestion.id}</h2>
            </div>
            <div className="suggestion-modal-layout">
              {selectedSuggestion.image_url ? (
                <img
                  className="suggestion-modal-photo"
                  src={selectedSuggestion.image_url}
                  alt={`Analysis ${selectedSuggestion.id}`}
                />
              ) : (
                <div className="suggestion-modal-photo-placeholder">No image</div>
              )}
              <p className="muted">
                Status:{' '}
                <span className={aiInspectionStatusBadge(selectedSuggestion.status)}>
                  {aiInspectionStatusLabel(selectedSuggestion.status)}
                </span>
              </p>
              {(selectedSuggestion.predictions ?? []).length === 0 ? (
                <p className="empty-state">No predictions for this analysis.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>AI prediction</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th>Final defect</th>
                        <th>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSuggestion.predictions.map((prediction) => (
                        <tr key={prediction.id}>
                          <td>
                            <strong>#{prediction.id}</strong>
                          </td>
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
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="primary-btn" onClick={closeSuggestionModal}>
                Close
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
            <div className="summary-item">
              <dt>Final defects</dt>
              <dd>{finalDefectsLabel}</dd>
            </div>
          </dl>

          {(canUpload || showAnalyzing) && (
            <section className="page-section">
              <h2>Upload photo</h2>
              <div className="card page-narrow">
                {showAnalyzing && !canUpload ? (
                  <p className="loading-state">Analyzing with AI…</p>
                ) : (
                  <form className="form-stack" onSubmit={handleAnalyze}>
                    <label>
                      Unit photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        required
                        disabled={showAnalyzing}
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={showAnalyzing || !imageFile}
                      >
                        {showAnalyzing ? 'Analyzing with AI…' : 'Upload & analyze'}
                      </button>
                    </div>
                  </form>
                )}
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

          {aiSuggestions.length > 0 && (
            <section className="page-section">
              <h2>Analysis history</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Run</th>
                      <th>Status</th>
                      <th>Predictions</th>
                      <th>Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiSuggestions.map((ai) => (
                      <tr
                        key={ai.id}
                        className="table-row-clickable"
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelectedSuggestion(ai)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSuggestion(ai);
                          }
                        }}
                      >
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
                          {(ai.predictions ?? []).filter((p) => p.status === 'approved').length}
                        </td>
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
