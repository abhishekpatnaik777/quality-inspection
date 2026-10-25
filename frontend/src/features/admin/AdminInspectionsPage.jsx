import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { DEFAULT_PAGE_SIZE } from '../../shared/api/pagination.js';
import PaginationBar from '../../shared/ui/PaginationBar.jsx';
import { inspectionStatusLabel } from '../inspection/defects.js';
import { inspectionStatusBadge } from '../inspection/statusBadge.js';

function fetchOverviewInspections({ page }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(DEFAULT_PAGE_SIZE),
  });
  const url = `/api/inspections/overview?${params}`;
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

export default function AdminInspectionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOverviewInspections({ page })
      .then((body) => {
        if (cancelled) return;
        setItems(body.items ?? []);
        setTotal(Number(body.total ?? 0));
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
  }, [page]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inspections</h1>
          <p className="subtitle">All logged inspections across quality engineers.</p>
        </div>
      </header>

      {!loading && !error && total > 0 && (
        <p className="muted filter-summary">
          {total} inspection{total === 1 ? '' : 's'}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading inspections…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No logged inspections yet.</p>
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
                  <th>Quality engineer</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.inspection_id}
                    className="table-row-clickable"
                    tabIndex={0}
                    role="link"
                    onClick={() => navigate(`/inspections/${item.inspection_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/inspections/${item.inspection_id}`);
                      }
                    }}
                  >
                    <td>
                      <strong>#{item.inspection_id}</strong>
                    </td>
                    <td className="cell-muted">#{item.product_id}</td>
                    <td>{item.sku_name ?? '—'}</td>
                    <td>
                      <span className={inspectionStatusBadge(item.status)}>
                        {inspectionStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="cell-muted">{item.total_defects ?? 0}</td>
                    <td>{item.inspector_name ?? '—'}</td>
                    <td className="cell-muted">{formatTimestamp(item.timestamp)}</td>
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
