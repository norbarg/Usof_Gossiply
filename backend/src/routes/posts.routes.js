import { Router } from 'express';
import { PostController } from '../controllers/PostController.js';
import { CommentController } from '../controllers/CommentController.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { FavoriteController } from '../controllers/FavoriteController.js';

const r = Router();

r.get(
    '/admin',
    authRequired,
    requireRole('admin'),
    PostController.listAllAdmin
);
r.get(
    '/admin/:post_id',
    authRequired,
    requireRole('admin'),
    PostController.getByIdAdmin
);
r.get(
    '/admin/:post_id/comments',
    authRequired,
    requireRole('admin'),
    PostController.listCommentsAdmin
);

// public list
r.get('/', PostController.list); //corrected
r.get('/:post_id', PostController.getById); //corrected
r.get('/:post_id/comments', PostController.listComments); //corrected
r.get('/:post_id/categories', PostController.listCategories); //corrected
r.get('/:post_id/like', PostController.likeList); //corrected

r.post('/', authRequired, PostController.create); //corrected
r.post('/:post_id/comments', authRequired, CommentController.createUnderPost); //corrected
r.post('/:post_id/like', authRequired, PostController.likeCreate); //corrected

r.patch(
    '/:post_id/image',
    authRequired,
    upload.single('image'),
    PostController.uploadImage
); //corrected

r.patch('/:post_id', authRequired, PostController.update); //corrected
r.delete('/:post_id', authRequired, PostController.remove); //corrected
r.delete('/:post_id/like', authRequired, PostController.likeDelete); //corrected

r.post('/:post_id/favorite', authRequired, FavoriteController.add);
r.delete('/:post_id/favorite', authRequired, FavoriteController.remove);
r.get(
    '/:post_id/comments/me',
    authRequired,
    PostController.listCommentsForViewer
);

export default r;
