import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import usersRouter from './routes/users.js';
import userRolesRouter from './routes/userRoles.js';
import skusRouter from './routes/skus.js';
import manufacturingUnitsRouter from './routes/manufacturingUnits.js';
import productsRouter from './routes/products.js';
import inspectionsRouter from './routes/inspections.js';
import { prisma } from './db/prisma.js';
import { UPLOADS_ROOT } from './lib/uploads.js';
import { getGoogleAiApiKey, isMockVisionEnabled } from './lib/vision.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_ROOT));

app.get('/api/health', async (_req, res) => {
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

app.use('/api/users', usersRouter);
app.use('/api/user-roles', userRolesRouter);
app.use('/api/skus', skusRouter);
app.use('/api/manufacturing-units', manufacturingUnitsRouter);
app.use('/api/products', productsRouter);
app.use('/api/inspections', inspectionsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Uploads dir: ${path.resolve(__dirname, '../uploads')}`);
});
