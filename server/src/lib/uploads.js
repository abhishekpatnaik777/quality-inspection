import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
export const INSPECTION_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'inspections');

fs.mkdirSync(INSPECTION_UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, INSPECTION_UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Only image uploads are allowed'));
    return;
  }
  cb(null, true);
}

export const inspectionImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export function publicImageUrl(filename) {
  return `/uploads/inspections/${filename}`;
}

export function absoluteFromPublicUrl(imageUrl) {
  const relative = imageUrl.replace(/^\/uploads\//, '');
  return path.join(UPLOADS_ROOT, relative);
}
