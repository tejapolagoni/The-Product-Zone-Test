import { Router } from 'express';
import multer from 'multer';
import {
  createProduct, deleteProduct, getProduct, listAdminProducts, listProducts, updateProduct
} from '../controllers/productController.js';
import { importProducts, previewProductImport } from '../controllers/bulkProductController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/admin/import/preview', requireAdmin, csvUpload.single('file'), asyncHandler(previewProductImport));
router.post('/admin/import', requireAdmin, csvUpload.single('file'), asyncHandler(importProducts));
router.get('/admin/all', requireAdmin, asyncHandler(listAdminProducts));
router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', requireAdmin, asyncHandler(createProduct));
router.put('/:id', requireAdmin, asyncHandler(updateProduct));
router.delete('/:id', requireAdmin, asyncHandler(deleteProduct));

export default router;
