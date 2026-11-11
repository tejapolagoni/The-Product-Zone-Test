import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();
const allowedTypes = new Map([
  ['image/jpeg', { extension: '.jpg', signature: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ['image/png', { extension: '.png', signature: buffer => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: '.webp', signature: buffer => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }],
  ['image/gif', { extension: '.gif', signature: buffer => ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) }]
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, allowedTypes.has(file.mimetype))
});

export function isSupportedImage(file) {
  const type = allowedTypes.get(file?.mimetype);
  return Boolean(type && Buffer.isBuffer(file.buffer) && type.signature(file.buffer));
}

function getImageBucket() {
  if (!mongoose.connection.db) throw new Error('MongoDB is not connected.');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'productImages' });
}

export async function getProductImage(req, res, next) {
  if (!mongoose.mongo.ObjectId.isValid(req.params.fileId)) return res.sendStatus(404);

  try {
    const bucket = getImageBucket();
    const id = new mongoose.mongo.ObjectId(req.params.fileId);
    const [file] = await bucket.find({ _id: id }).limit(1).toArray();
    if (!file) return res.sendStatus(404);

    res.set({
      'Content-Type': file.metadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    const stream = bucket.openDownloadStream(id);
    stream.on('error', error => {
      if (res.headersSent) res.destroy(error);
      else next(error);
    });
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

router.post('/', requireAdmin, upload.single('image'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a JPEG, PNG, WebP or GIF image under 5 MB.' });
  if (!isSupportedImage(req.file)) return res.status(400).json({ message: 'The uploaded file does not match a supported image format.' });

  try {
    const bucket = getImageBucket();
    const filename = `${crypto.randomUUID()}${allowedTypes.get(req.file.mimetype).extension}`;
    const stream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { contentType: req.file.mimetype }
    });
    stream.on('error', next);
    stream.on('finish', () => res.status(201).json({ image: `/uploads/${stream.id}` }));
    stream.end(req.file.buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
