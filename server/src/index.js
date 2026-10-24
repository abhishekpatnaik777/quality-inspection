import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import userRolesRouter from './routes/userRoles.js';
import skusRouter from './routes/skus.js';
import manufacturingUnitsRouter from './routes/manufacturingUnits.js';
import productsRouter from './routes/products.js';
import { prisma } from './db/prisma.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

app.use('/api/users', usersRouter);
app.use('/api/user-roles', userRolesRouter);
app.use('/api/skus', skusRouter);
app.use('/api/manufacturing-units', manufacturingUnitsRouter);
app.use('/api/products', productsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
