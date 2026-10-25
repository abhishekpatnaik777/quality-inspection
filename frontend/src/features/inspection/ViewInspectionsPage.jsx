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

function formatDisplayDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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
                  <th>ID</th>
                  <th>Date</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Defects</th>
                  <th>Status</th>
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
                    <td className="cell-muted">{formatDisplayDate(inspection.inspection_date)}</td>
                    <td className="cell-muted">#{inspection.product_id}</td>
                    <td>{inspection.product?.sku_name ?? '—'}</td>
                    <td className="cell-muted">{inspection.results?.length || 0}</td>
                    <td>
                      <span className={inspectionStatusBadge(inspection.status)}>
                        {inspectionStatusLabel(inspection.status)}
                      </span>
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
