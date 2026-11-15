import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  createProduct, deleteProduct, getProduct, listAdminProducts, listProducts, trackAffiliateClick, updateProduct
} from '../controllers/productController.js';
import { importProducts, previewProductImport } from '../controllers/bulkProductController.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const affiliateClickLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/admin/import/preview', requireAdmin, csvUpload.single('file'), asyncHandler(previewProductImport));
router.post('/admin/import', requireAdmin, csvUpload.single('file'), asyncHandler(importProducts));
router.get('/admin/all', requireAdmin, asyncHandler(listAdminProducts));
router.post('/:id/affiliate-click', requireTrustedOrigin, affiliateClickLimiter, asyncHandler(trackAffiliateClick));
router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', requireAdmin, asyncHandler(createProduct));
router.put('/:id', requireAdmin, asyncHandler(updateProduct));
router.delete('/:id', requireAdmin, asyncHandler(deleteProduct));

export default router;
