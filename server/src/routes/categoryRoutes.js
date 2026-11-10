import { Router } from 'express';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../controllers/categoryController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.get('/', asyncHandler(listCategories));
router.post('/', requireAdmin, asyncHandler(createCategory));
router.put('/:id', requireAdmin, asyncHandler(updateCategory));
router.delete('/:id', requireAdmin, asyncHandler(deleteCategory));

export default router;
