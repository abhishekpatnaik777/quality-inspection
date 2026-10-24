import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { isPrismaKnownError, serializeSku } from '../db/serializers.js';
import { validateCreateSku, validateSkuId } from '../lib/skus.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const skus = await prisma.sku.findMany({ orderBy: { id: 'asc' } });
    res.json(skus.map(serializeSku));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch SKUs' });
  }
});

router.get('/:id', async (req, res) => {
  const id = validateSkuId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    const sku = await prisma.sku.findUnique({ where: { id: id.value } });
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    res.json(serializeSku(sku));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch SKU' });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateSku(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { name, category, model, created_by, updated_by } = parsed.value;

  try {
    const sku = await prisma.sku.create({
      data: {
        name,
        category,
        model,
        createdBy: created_by,
        updatedBy: updated_by,
      },
    });
    res.status(201).json(serializeSku(sku));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'SKU with this category and model already exists' });
    }
    res.status(500).json({ error: 'Failed to create SKU' });
  }
});

export default router;
