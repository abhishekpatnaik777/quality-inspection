import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { isPrismaKnownError, serializeBatch, serializeProduct } from '../db/serializers.js';
import { buildBatchNumber, validateGenerateProducts } from '../lib/products.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        batch: {
          include: {
            sku: true,
            manufacturingUnit: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    res.json(products.map(serializeProduct));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/generate', async (req, res) => {
  const parsed = validateGenerateProducts(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { sku_id, manufacturing_unit_id, manufacturing_date, created_by, updated_by } =
    parsed.value;

  try {
    const [sku, unit] = await Promise.all([
      prisma.sku.findUnique({ where: { id: sku_id } }),
      prisma.manufacturingUnit.findUnique({ where: { id: manufacturing_unit_id } }),
    ]);

    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    if (!unit) {
      return res.status(404).json({ error: 'Manufacturing unit not found' });
    }
    if (unit.capacity < 1) {
      return res.status(400).json({ error: 'Manufacturing unit capacity must be at least 1' });
    }

    const batchNumber = buildBatchNumber({
      skuId: sku.id,
      manufacturingUnitId: unit.id,
    });

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          batchNumber,
          manufacturingUnitId: unit.id,
          skuId: sku.id,
          manufacturingDate: manufacturing_date,
          createdBy: created_by,
          updatedBy: updated_by,
        },
        include: {
          sku: true,
          manufacturingUnit: true,
        },
      });

      await tx.product.createMany({
        data: Array.from({ length: unit.capacity }, () => ({
          batchId: batch.id,
          status: 'usable',
          createdBy: created_by,
          updatedBy: updated_by,
        })),
      });

      const products = await tx.product.findMany({
        where: { batchId: batch.id },
        orderBy: { id: 'asc' },
        include: {
          batch: {
            include: {
              sku: true,
              manufacturingUnit: true,
            },
          },
        },
      });

      return { batch, products };
    });

    res.status(201).json({
      message: `Generating ${unit.capacity} ${sku.name} with a unique batch Id.`,
      capacity: unit.capacity,
      sku_name: sku.name,
      batch: serializeBatch(result.batch),
      products_created: result.products.length,
      products: result.products.map(serializeProduct),
    });
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'batch number collision, please retry' });
    }
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'Invalid SKU, manufacturing unit, or audit user' });
    }
    res.status(500).json({ error: 'Failed to generate products' });
  }
});

export default router;
