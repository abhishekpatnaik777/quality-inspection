-- Initial schema (applied by `npm run db:up` / `npm run db:migrate`)

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);

INSERT INTO items (name, status, notes)
SELECT v.name, v.status, v.notes
FROM (
  VALUES
    ('Sample Widget A', 'pending', 'Awaiting first inspection'),
    ('Sample Widget B', 'passed', 'Looks good'),
    ('Sample Widget C', 'failed', 'Surface scratch detected')
) AS v(name, status, notes)
WHERE NOT EXISTS (SELECT 1 FROM items LIMIT 1);
