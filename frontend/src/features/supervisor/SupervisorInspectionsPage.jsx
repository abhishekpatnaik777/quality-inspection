import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { inflightJson } from '../../shared/api/inflightFetch.js';
import { DEFAULT_PAGE_SIZE } from '../../shared/api/pagination.js';
import PaginationBar from '../../shared/ui/PaginationBar.jsx';
import { DEFECT_TYPES, inspectionStatusLabel } from '../inspection/defects.js';
import { inspectionStatusBadge } from '../inspection/statusBadge.js';

const DEFECT_TYPE_VALUES = new Set(DEFECT_TYPES.map((type) => type.value));

function fetchSupervisedInspections({ supervisorId, defectType, inspectorId, skuId, page }) {
  const params = new URLSearchParams({
    supervisor_id: String(supervisorId),
    page: String(page),
    limit: String(DEFAULT_PAGE_SIZE),
  });
  if (defectType) params.set('defect_type', defectType);
  if (inspectorId) params.set('inspector_id', inspectorId);
  if (skuId) params.set('sku_id', skuId);
  const url = `/api/inspections/supervised?${params}`;
  return inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load team inspections' });
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

export default function SupervisorInspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const supervisorId = user?.id;

  const initialDefectType = searchParams.get('defect_type') || '';
  const initialSkuId = searchParams.get('sku_id') || '';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [inspectors, setInspectors] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [defectType, setDefectType] = useState(
    DEFECT_TYPE_VALUES.has(initialDefectType) ? initialDefectType : ''
  );
  const [inspectorId, setInspectorId] = useState('');
  const [skuId, setSkuId] = useState(initialSkuId);

  useEffect(() => {
    const nextDefect = searchParams.get('defect_type') || '';
    const nextSku = searchParams.get('sku_id') || '';
    setDefectType(DEFECT_TYPE_VALUES.has(nextDefect) ? nextDefect : '');
    setSkuId(nextSku);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [defectType, inspectorId, skuId]);

  function resetFilters() {
    setDefectType('');
    setInspectorId('');
    setSkuId('');
    if ([...searchParams.keys()].length > 0) {
      setSearchParams({}, { replace: true });
    }
  }

  const filtersActive = Boolean(defectType || inspectorId || skuId);

  useEffect(() => {
    let cancelled = false;

    if (!supervisorId) {
      setLoading(false);
      setError('Signed-in supervisor is required');
      return undefined;
    }

    setLoading(true);
    fetchSupervisedInspections({
      supervisorId,
      defectType,
      inspectorId,
      skuId,
      page,
    })
      .then((body) => {
        if (cancelled) return;
        setItems(body.items ?? []);
        setTotal(Number(body.total ?? 0));
        setInspectors(body.inspectors ?? []);
        setSkus(body.skus ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load team inspections');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supervisorId, defectType, inspectorId, skuId, page]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Team inspections</h1>
          <p className="subtitle">
            Logged inspections from quality engineers reporting to {user?.name || 'you'}.
          </p>
        </div>
      </header>

      <div className="filter-bar">
        <label>
          SKU
          <select value={skuId} onChange={(e) => setSkuId(e.target.value)}>
            <option value="">All SKUs</option>
            {skus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Defect type
          <select value={defectType} onChange={(e) => setDefectType(e.target.value)}>
            <option value="">All defect types</option>
            {DEFECT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inspector
          <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
            <option value="">All inspectors</option>
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-bar-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={resetFilters}
            disabled={!filtersActive}
          >
            Reset
          </button>
        </div>
      </div>

      {!loading && !error && total > 0 && (
        <p className="muted filter-summary">
          {total} inspection{total === 1 ? '' : 's'}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading team inspections…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No logged inspections match these filters.</p>
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
                    <td className="cell-muted">
                      {item.total_defects ?? item.final_defect_count ?? 0}
                    </td>
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
