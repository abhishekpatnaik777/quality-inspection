import express from 'express';
import cors from 'cors';
import { env } from './config/environment.js';
import { UPLOADS_ROOT } from './utils/uploads.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

// Avoid 304 Not Modified on JSON APIs (Express ETags + browser conditional GETs).
app.set('etag', false);
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/uploads', express.static(UPLOADS_ROOT));
app.use('/api', apiRouter);
app.use(errorMiddleware);

export default app;
