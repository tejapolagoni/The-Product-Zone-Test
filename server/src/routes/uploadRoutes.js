import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();
const allowedTypes = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']
]);
const storage = multer.diskStorage({
  destination: path.resolve('uploads'),
  filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${allowedTypes.get(file.mimetype)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, allowedTypes.has(file.mimetype))
});

router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a JPEG, PNG, WebP or GIF image under 5 MB.' });
  res.status(201).json({ image: `/uploads/${req.file.filename}` });
});

export default router;
