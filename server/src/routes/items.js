import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, status, notes, created_at, updated_at FROM items ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, status, notes, created_at, updated_at FROM items WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

router.post('/', async (req, res) => {
  const { name, status = 'pending', notes = null } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO items (name, status, notes)
       VALUES ($1, $2, $3)
       RETURNING id, name, status, notes, created_at, updated_at`,
      [name.trim(), status, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, status, notes } = req.body ?? {};

  try {
    const { rows } = await query(
      `UPDATE items
       SET
         name = COALESCE($1, name),
         status = COALESCE($2, status),
         notes = COALESCE($3, notes),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, status, notes, created_at, updated_at`,
      [name ?? null, status ?? null, notes ?? null, req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM items WHERE id = $1', [
      req.params.id,
    ]);
    if (!rowCount) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
