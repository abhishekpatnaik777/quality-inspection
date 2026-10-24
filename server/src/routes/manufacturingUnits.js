import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { isPrismaKnownError, serializeManufacturingUnit } from '../db/serializers.js';
import {
  validateCreateManufacturingUnit,
  validateManufacturingUnitId,
} from '../lib/manufacturingUnits.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const units = await prisma.manufacturingUnit.findMany({ orderBy: { id: 'asc' } });
    res.json(units.map(serializeManufacturingUnit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch manufacturing units' });
  }
});

router.get('/:id', async (req, res) => {
  const id = validateManufacturingUnitId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    const unit = await prisma.manufacturingUnit.findUnique({ where: { id: id.value } });
    if (!unit) {
      return res.status(404).json({ error: 'Manufacturing unit not found' });
    }
    res.json(serializeManufacturingUnit(unit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch manufacturing unit' });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateManufacturingUnit(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { name, location, capacity, created_by, updated_by } = parsed.value;

  try {
    const unit = await prisma.manufacturingUnit.create({
      data: {
        name,
        location,
        capacity,
        createdBy: created_by,
        updatedBy: updated_by,
      },
    });
    res.status(201).json(serializeManufacturingUnit(unit));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'created_by or updated_by user does not exist' });
    }
    res.status(500).json({ error: 'Failed to create manufacturing unit' });
  }
});

export default router;
