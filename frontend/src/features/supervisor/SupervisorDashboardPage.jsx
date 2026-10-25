import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { defectLabel } from '../inspection/defects.js';

function fetchSupervisedSummary({ supervisorId, skuId, batchId }) {
  const params = new URLSearchParams({ supervisor_id: String(supervisorId) });
  if (skuId) params.set('sku_id', skuId);
  if (batchId) params.set('batch_id', batchId);
  const url = `/api/inspections/supervised/summary?${params}`;
  return inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load dashboard' });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function KpiCard({ label, value, tone, hint }) {
  return (
    <article className={`kpi-card${tone ? ` kpi-card-${tone}` : ''}`}>
      <p className="kpi-label">{label}</p>
      <p className={`kpi-value${tone ? ` kpi-${tone}` : ''}`}>{value}</p>
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </article>
  );
}

export default function SupervisorDashboardPage() {
  const { user } = useAuth();
  const supervisorId = user?.id;

  const [summary, setSummary] = useState(null);
  const [skus, setSkus] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skuId, setSkuId] = useState('');
  const [batchId, setBatchId] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!supervisorId) {
      setLoading(false);
      setError('Signed-in supervisor is required');
      return undefined;
    }

    setLoading(true);
    fetchSupervisedSummary({ supervisorId, skuId, batchId })
      .then((body) => {
        if (cancelled) return;
        setSummary(body.summary ?? null);
        setSkus(body.skus ?? []);
        setBatches(body.batches ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supervisorId, skuId, batchId]);

  const batchesForSku = useMemo(() => {
    if (!skuId) return batches;
    return batches.filter((batch) => String(batch.sku_id) === skuId);
  }, [batches, skuId]);

  function handleSkuChange(nextSkuId) {
    setSkuId(nextSkuId);
    if (
      batchId &&
      nextSkuId &&
      !batches.some((batch) => String(batch.id) === batchId && String(batch.sku_id) === nextSkuId)
    ) {
      setBatchId('');
    }
  }

  const breakdown = summary?.defect_breakdown ?? [];
  const hasActivity =
    summary &&
    (summary.total_inspected > 0 ||
      summary.total_predictions > 0 ||
      summary.passed > 0 ||
      summary.failed > 0);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">
            Quality and AI verification summary for engineers reporting to {user?.name || 'you'}.
          </p>
        </div>
      </header>

      <div className="filter-bar">
        <label>
          SKU
          <select value={skuId} onChange={(e) => handleSkuChange(e.target.value)}>
            <option value="">All SKUs</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Batch
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">All batches</option>
            {batchesForSku.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batch_number}
                {batch.sku_name ? ` · ${batch.sku_name}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading dashboard…</p>
      ) : !summary ? (
        <p className="empty-state">No dashboard data available.</p>
      ) : !hasActivity ? (
        <p className="empty-state">No logged inspections match these filters.</p>
      ) : (
        <>
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2>Product quality</h2>
              <p>Outcomes across inspected products</p>
            </div>
            <div className="kpi-grid kpi-grid-3">
              <KpiCard label="Products Inspected" value={summary.total_inspected} />
              <KpiCard
                label="Products Defective"
                value={summary.products_defective ?? 0}
                tone="bad"
              />
              <KpiCard
                label="Products defect %"
                value={formatPercent(summary.defect_rate)}
                tone={summary.defect_rate > 0 ? 'warn' : 'ok'}
              />
            </div>
            <div className="kpi-meter" aria-hidden="true">
              <div
                className="kpi-meter-fill kpi-meter-bad"
                style={{ width: `${Math.min(100, Number(summary.defect_rate) || 0)}%` }}
              />
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2>AI verification</h2>
              <p>How engineers handled model predictions</p>
            </div>
            <div className="kpi-grid kpi-grid-4">
              <KpiCard label="Total Predictions" value={summary.total_predictions} />
              <KpiCard
                label="Accepted Predictions"
                value={summary.accepted ?? summary.passed}
                tone="ok"
              />
              <KpiCard label="Overridden predictions" value={summary.failed} tone="bad" />
              <KpiCard
                label="AI acceptance rate"
                value={formatPercent(summary.ai_acceptance_rate)}
                tone="accent"
              />
            </div>
            <div className="kpi-meter" aria-hidden="true">
              <div
                className="kpi-meter-fill kpi-meter-ok"
                style={{
                  width: `${Math.min(100, Number(summary.ai_acceptance_rate) || 0)}%`,
                }}
              />
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2>Defect type breakdown</h2>
              <p>Final verified defect categories</p>
            </div>
            {breakdown.length === 0 ? (
              <p className="muted">No verified predictions in this selection.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Final defect type</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((row) => (
                      <tr key={row.defect_type}>
                        <td>
                          <strong>{defectLabel(row.defect_type)}</strong>
                        </td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
