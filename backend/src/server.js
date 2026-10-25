import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/environment.js';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Uploads dir: ${path.resolve(__dirname, '../uploads')}`);
});
