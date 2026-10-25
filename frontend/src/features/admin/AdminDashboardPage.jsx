import { useEffect, useState } from 'react';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { defectLabel } from '../inspection/defects.js';

function fetchOverviewSummary() {
  const url = '/api/inspections/overview/summary';
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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOverviewSummary()
      .then((body) => {
        if (cancelled) return;
        setSummary(body.summary ?? null);
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
  }, []);

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
          <p className="subtitle">Quality and AI verification summary across all inspections.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading dashboard…</p>
      ) : !summary ? (
        <p className="empty-state">No dashboard data available.</p>
      ) : !hasActivity ? (
        <p className="empty-state">No logged inspections yet.</p>
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
              <p className="muted">No verified predictions yet.</p>
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
