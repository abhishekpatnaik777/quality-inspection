import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { DEFAULT_PAGE_SIZE, withPaginationParams } from '../../shared/api/pagination.js';
import PaginationBar from '../../shared/ui/PaginationBar.jsx';
import { inspectionStatusLabel } from './defects.js';
import { inspectionStatusBadge } from './statusBadge.js';

function fetchInspectionsForUser(userId, page) {
  const url = withPaginationParams(`/api/inspections?user_id=${userId}`, {
    page,
    limit: DEFAULT_PAGE_SIZE,
  });
  return inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load inspections' });
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function latestPredictionTimestamp(inspection) {
  let latestMs = 0;
  for (const ai of inspection.ai_inspections ?? []) {
    for (const prediction of ai.predictions ?? []) {
      const value = prediction.verified_at ?? prediction.updated_at;
      const ms = value ? new Date(value).getTime() : NaN;
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
  }
  if (latestMs > 0) return new Date(latestMs).toISOString();
  return inspection.updated_at ?? null;
}

export default function ViewInspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const engineerId = user?.id;

  useEffect(() => {
    let cancelled = false;

    if (!engineerId) {
      setLoading(false);
      setError('Signed-in quality engineer is required');
      return undefined;
    }

    setLoading(true);
    fetchInspectionsForUser(engineerId, page)
      .then((data) => {
        if (cancelled) return;
        setInspections(data.items ?? []);
        setTotal(Number(data.total ?? 0));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load inspections');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [engineerId, page]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inspections</h1>
          <p className="subtitle">Previous inspections for {user?.name || 'this engineer'}.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading inspections…</p>
      ) : inspections.length === 0 ? (
        <p className="empty-state">No inspections yet.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inspection</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th>Total defects</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => (
                  <tr
                    key={inspection.id}
                    className="table-row-clickable"
                    tabIndex={0}
                    role="link"
                    onClick={() => navigate(`/inspections/${inspection.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/inspections/${inspection.id}`);
                      }
                    }}
                  >
                    <td>
                      <strong>#{inspection.id}</strong>
                    </td>
                    <td className="cell-muted">#{inspection.product_id}</td>
                    <td>{inspection.product?.sku_name ?? '—'}</td>
                    <td>
                      <span className={inspectionStatusBadge(inspection.status)}>
                        {inspectionStatusLabel(inspection.status)}
                      </span>
                    </td>
                    <td className="cell-muted">{inspection.results?.length || 0}</td>
                    <td className="cell-muted">
                      {formatTimestamp(latestPredictionTimestamp(inspection))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={page}
            limit={DEFAULT_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
