import { useCallback, useEffect, useState } from 'react'
import './App.css'

const STATUSES = ['pending', 'passed', 'failed']

function App() {
  const [items, setItems] = useState([])
  const [health, setHealth] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [healthRes, itemsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/items'),
      ])
      const healthData = await healthRes.json()
      setHealth(healthData)

      if (!itemsRes.ok) {
        throw new Error('Failed to load items')
      }
      setItems(await itemsRes.json())
    } catch (err) {
      setError(err.message || 'Unable to reach API')
      setHealth({ status: 'down', database: 'unknown' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to create item')
      }
      setName('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(id, status) {
    setError(null)
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        throw new Error('Failed to update status')
      }
      const updated = await res.json()
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeItem(id) {
    setError(null)
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Failed to delete item')
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Quality Inspection</p>
          <h1>Inspection queue</h1>
          <p className="subtitle">
            React + Express + PostgreSQL boilerplate with a working CRUD flow.
          </p>
        </div>
        <div
          className={`health ${health?.database === 'connected' ? 'ok' : 'bad'}`}
        >
          <span className="dot" />
          {health
            ? `API ${health.status} · DB ${health.database}`
            : 'Checking…'}
        </div>
      </header>

      <form className="create" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? 'Adding…' : 'Add item'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading items…</p>
      ) : items.length === 0 ? (
        <p className="muted">No items yet. Add one above.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className="row">
              <div className="meta">
                <strong>{item.name}</strong>
                {item.notes && <span className="notes">{item.notes}</span>}
              </div>
              <select
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value)}
                aria-label={`Status for ${item.name}`}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ghost"
                onClick={() => removeItem(item.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
