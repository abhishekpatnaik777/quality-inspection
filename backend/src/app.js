import express from 'express';
import cors from 'cors';
import { env } from './config/environment.js';
import { UPLOADS_ROOT } from './utils/uploads.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_ROOT));
app.use('/api', apiRouter);
app.use(errorMiddleware);

export default app;
