import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './UsersPage.css';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
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
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const [productsRes, skusRes, unitsRes] = await Promise.all([
          fetch('/api/products', { signal: controller.signal }),
          fetch('/api/skus', { signal: controller.signal }),
          fetch('/api/manufacturing-units', { signal: controller.signal }),
        ]);
        if (!productsRes.ok) throw new Error('Failed to load products');
        if (!skusRes.ok) throw new Error('Failed to load SKUs');
        if (!unitsRes.ok) throw new Error('Failed to load manufacturing units');
        const [nextProducts, nextSkus, nextUnits] = await Promise.all([
          productsRes.json(),
          skusRes.json(),
          unitsRes.json(),
        ]);
        setProducts(nextProducts);
        setSkus(nextSkus);
        setUnits(nextUnits);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Unable to load products');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

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

      if (Array.isArray(body.products)) {
        setProducts((prev) => [...prev, ...body.products]);
      }
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
    <div className="users-page">
      <header className="users-header">
        <div>
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
          <h1>Products</h1>
          <p className="subtitle">
            {products.length} product{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={openModal}
          disabled={skus.length === 0 || units.length === 0}
        >
          Add product
        </button>
      </header>

      {(skus.length === 0 || units.length === 0) && (
        <p className="muted">
          Add at least one SKU and one manufacturing unit before generating products.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="muted">No products yet.</p>
      ) : (
        <ul className="user-list">
          {products.map((product) => (
            <li key={product.id} className="user-row">
              <div className="user-meta">
                <strong>
                  #{product.id} · {product.sku_name}
                </strong>
                <span className="muted-line">
                  Batch {product.batch_number} · {product.manufacturing_unit_name}
                </span>
              </div>
              <div className="user-tags">
                <span className="tag tag-status">{product.status}</span>
              </div>
            </li>
          ))}
        </ul>
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
