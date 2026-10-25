import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { sharedInflight } from '../../shared/api/inflightFetch.js';
import { fetchAllPages } from '../../shared/api/pagination.js';

function loadInspectionCatalog() {
  return sharedInflight('inspections-page-catalog', () =>
    Promise.all([
      fetchAllPages('/api/products', { errorMessage: 'Failed to load products' }),
      fetchAllPages('/api/manufacturing-units', {
        errorMessage: 'Failed to load manufacturing units',
      }),
      fetchAllPages('/api/skus', { errorMessage: 'Failed to load SKUs' }),
    ]).then(([nextProducts, nextUnits, nextSkus]) => ({
      products: nextProducts,
      units: nextUnits,
      skus: nextSkus,
    }))
  );
}

export default function InspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skus, setSkus] = useState([]);
  const [units, setUnits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [skuId, setSkuId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [productId, setProductId] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState(null);

  const engineerId = user?.id;

  useEffect(() => {
    let cancelled = false;

    if (!engineerId) {
      setLoading(false);
      setError('Signed-in quality engineer is required');
      return undefined;
    }

    loadInspectionCatalog()
      .then(({ products: nextProducts, units: nextUnits, skus: nextSkus }) => {
        if (cancelled) return;
        setProducts(nextProducts);
        setUnits(nextUnits);
        setSkus(nextSkus);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load catalog');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [engineerId]);

  const batchesForSkuAndUnit = useMemo(() => {
    if (!skuId || !unitId) return [];
    const byBatch = new Map();
    for (const product of products) {
      if (String(product.sku_id) !== skuId) continue;
      if (String(product.manufacturing_unit_id) !== unitId) continue;
      if (!byBatch.has(product.batch_id)) {
        byBatch.set(product.batch_id, product.batch_number);
      }
    }
    return [...byBatch.entries()]
      .map(([id, batch_number]) => ({ id, batch_number }))
      .sort((a, b) => String(a.batch_number).localeCompare(String(b.batch_number)));
  }, [products, skuId, unitId]);

  const productsForBatch = useMemo(() => {
    if (!batchId) return [];
    return products.filter((product) => String(product.batch_id) === batchId);
  }, [products, batchId]);

  function handleSkuChange(nextSkuId) {
    setSkuId(nextSkuId);
    setBatchId('');
    setProductId('');
  }

  function handleUnitChange(nextUnitId) {
    setUnitId(nextUnitId);
    setBatchId('');
    setProductId('');
  }

  function handleBatchChange(nextBatchId) {
    setBatchId(nextBatchId);
    setProductId('');
  }

  async function handleStartInspection(e) {
    e.preventDefault();
    if (!engineerId || !productId) return;
    setCreating(true);
    setActionError(null);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(productId),
          user_id: engineerId,
          created_by: engineerId,
          updated_by: engineerId,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to start inspection');
      navigate(`/inspections/${body.id}`);
    } catch (err) {
      setActionError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Start inspection</h1>
          <p className="subtitle">Choose SKU, unit, batch, and product to begin.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {loading ? (
        <p className="loading-state">Loading…</p>
      ) : skus.length === 0 || units.length === 0 ? (
        <p className="empty-state">
          Add at least one SKU and manufacturing unit, then generate products, before starting an
          inspection.
        </p>
      ) : (
        <div className="card page-narrow">
          <form className="form-stack" onSubmit={handleStartInspection}>
            <label>
              SKU
              <select
                value={skuId}
                onChange={(e) => handleSkuChange(e.target.value)}
                required
                disabled={creating}
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
                onChange={(e) => handleUnitChange(e.target.value)}
                required
                disabled={creating}
              >
                <option value="" disabled>
                  Select manufacturing unit
                </option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} · {unit.location}
                  </option>
                ))}
              </select>
            </label>

            {skuId && unitId && (
              <label>
                Batch number
                <select
                  value={batchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  required
                  disabled={creating || batchesForSkuAndUnit.length === 0}
                >
                  <option value="" disabled>
                    {batchesForSkuAndUnit.length === 0
                      ? 'No batches for this SKU and unit'
                      : 'Select batch number'}
                  </option>
                  {batchesForSkuAndUnit.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {batchId && (
              <label>
                Product number
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                  disabled={creating || productsForBatch.length === 0}
                >
                  <option value="" disabled>
                    {productsForBatch.length === 0 ? 'No products in this batch' : 'Select product'}
                  </option>
                  {productsForBatch.map((product) => (
                    <option key={product.id} value={product.id}>
                      #{product.id} · {product.sku_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={creating || !productId}>
                {creating ? 'Starting…' : 'Start inspection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
