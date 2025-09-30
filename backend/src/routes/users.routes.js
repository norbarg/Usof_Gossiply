import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { FavoriteController } from '../controllers/FavoriteController.js';

const r = Router();
r.get('/', authRequired, requireRole('admin'), UserController.getAll); // admin only corrected
r.get('/:user_id', authRequired, UserController.getById); //corrected
r.post('/', authRequired, requireRole('admin'), UserController.create); // admin creates users/admins corrected
r.patch(
    '/avatar',
    authRequired,
    upload.single('avatar'),
    UserController.uploadAvatar
); //corrected
r.patch('/:user_id', authRequired, UserController.update); //corrected
r.delete('/:user_id', authRequired, UserController.remove); //corrected

r.get('/me/favorites', authRequired, FavoriteController.listMine);
r.get('/me/posts', authRequired, UserController.listMyPosts);

export default r;
