import { Router } from 'express';
import { prisma } from '../config/database.js';
import {
  getGoogleAiApiKey,
  isMockVisionEnabled,
} from '../modules/inspection/aiInspection/vision.service.js';
import userRouter from '../modules/user/user.route.js';
import skuRouter from '../modules/sku/sku.route.js';
import manufacturingUnitRouter from '../modules/manufacturingUnit/manufacturingUnit.route.js';
import productRouter from '../modules/product/product.route.js';
import inspectionRouter from '../modules/inspection/inspection.route.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      vision: isMockVisionEnabled()
        ? 'mock'
        : getGoogleAiApiKey()
          ? 'google_gemini'
          : 'mock_missing_or_placeholder_key',
    });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

router.use('/users', userRouter);
router.use('/skus', skuRouter);
router.use('/manufacturing-units', manufacturingUnitRouter);
router.use('/products', productRouter);
router.use('/inspections', inspectionRouter);

export default router;
