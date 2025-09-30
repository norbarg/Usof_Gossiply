import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const r = Router();
r.get('/', CategoryController.list); //corrected
r.get('/:category_id', CategoryController.getById); //corrected
r.get('/:category_id/posts', CategoryController.posts); //corrected
r.post('/', authRequired, requireRole('admin'), CategoryController.create); //corrected
r.patch(
    '/:category_id',
    authRequired,
    requireRole('admin'),
    CategoryController.update
); //corrected
r.delete(
    '/:category_id',
    authRequired,
    requireRole('admin'),
    CategoryController.remove
); //corrected
export default r;
