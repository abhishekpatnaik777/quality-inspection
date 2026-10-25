import { useEffect, useMemo, useState } from 'react';
import { inflightJson, sharedInflight } from '../../shared/api/inflightFetch.js';
import {
  DEFAULT_PAGE_SIZE,
  fetchAllPages,
  withPaginationParams,
} from '../../shared/api/pagination.js';
import PaginationBar from '../../shared/ui/PaginationBar.jsx';

function loadFormCatalog() {
  return sharedInflight('products-page-form-catalog', () =>
    Promise.all([
      fetchAllPages('/api/skus', { errorMessage: 'Failed to load SKUs' }),
      fetchAllPages('/api/manufacturing-units', {
        errorMessage: 'Failed to load manufacturing units',
      }),
    ]).then(([nextSkus, nextUnits]) => ({
      skus: nextSkus,
      units: nextUnits,
    }))
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [skus, setSkus] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [skuId, setSkuId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const selectedSku = useMemo(
    () => skus.find((sku) => String(sku.id) === skuId) ?? null,
    [skus, skuId]
  );
  const selectedUnit = useMemo(
    () => units.find((unit) => String(unit.id) === unitId) ?? null,
    [units, unitId]
  );

  const previewMessage =
    selectedSku && selectedUnit
      ? `Generating ${selectedUnit.capacity} ${selectedSku.name} with a unique batch Id.`
      : null;

  useEffect(() => {
    let cancelled = false;

    loadFormCatalog()
      .then(({ skus: nextSkus, units: nextUnits }) => {
        if (cancelled) return;
        setSkus(nextSkus);
        setUnits(nextUnits);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load products');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = withPaginationParams('/api/products', { page, limit: DEFAULT_PAGE_SIZE });

    inflightJson(`GET ${url}`, url, { errorMessage: 'Failed to load products' })
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items ?? []);
        setTotal(Number(data.total ?? 0));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load products');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  function openModal() {
    setSkuId(skus[0] ? String(skus[0].id) : '');
    setUnitId(units[0] ? String(units[0].id) : '');
    setFormError(null);
    setStatusMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setStatusMessage(null);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!selectedSku || !selectedUnit) {
      setFormError('Please select SKU and manufacturing unit');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setStatusMessage(previewMessage);

    try {
      const res = await fetch('/api/products/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: Number(skuId),
          manufacturing_unit_id: Number(unitId),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to generate products');

      setReloadToken((n) => n + 1);
      setStatusMessage(
        `${body.message} Batch ${body.batch?.batch_number} created (${body.products_created} products).`
      );
      setTimeout(() => {
        setModalOpen(false);
        setStatusMessage(null);
      }, 1200);
    } catch (err) {
      setFormError(err.message);
      setStatusMessage(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Products</h1>
          <p className="subtitle">
            {total} product{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={openModal}
            disabled={skus.length === 0 || units.length === 0}
          >
            Add product
          </button>
        </div>
      </header>

      {(skus.length === 0 || units.length === 0) && (
        <p className="hint">
          Add at least one SKU and one manufacturing unit before generating products.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading-state">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="empty-state">No products yet.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SKU</th>
                  <th>Batch</th>
                  <th>Manufacturing unit</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>#{product.id}</strong>
                    </td>
                    <td>{product.sku_name}</td>
                    <td className="cell-muted">{product.batch_number}</td>
                    <td className="cell-muted">{product.manufacturing_unit_name}</td>
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

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-product-title">Add product</h2>
              <button
                type="button"
                className="ghost-btn"
                onClick={closeModal}
                disabled={submitting}
              >
                Close
              </button>
            </div>

            <form className="modal-form" onSubmit={handleGenerate}>
              <label>
                SKU
                <select
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Select SKU
                  </option>
                  {skus.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.name} ({sku.model})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Manufacturing unit
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Select unit
                  </option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} · capacity {unit.capacity}
                    </option>
                  ))}
                </select>
              </label>

              {previewMessage && <p className="muted">{previewMessage}</p>}
              {statusMessage && <p className="muted">{statusMessage}</p>}
              {formError && <p className="error">{formError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting || !skuId || !unitId}
                >
                  {submitting ? 'Generating…' : 'Generate products'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
