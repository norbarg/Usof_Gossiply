//routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import postRoutes from './posts.routes.js';
import categoryRoutes from './categories.routes.js';
import commentRoutes from './comments.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/categories', categoryRoutes);
router.use('/comments', commentRoutes);

export default router;
