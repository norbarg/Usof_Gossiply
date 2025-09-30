import { Router } from 'express';
import { CommentController } from '../controllers/CommentController.js';
import { authRequired } from '../middleware/auth.js';

const r = Router();
r.get('/:comment_id', CommentController.getById); //corrected
r.get('/:comment_id/like', CommentController.likeList); //corrected
r.post('/:comment_id/like', authRequired, CommentController.likeCreate); //corrected
r.delete('/:comment_id/like', authRequired, CommentController.likeDelete); //corrected
r.patch('/:comment_id', authRequired, CommentController.update); //corrected
r.delete('/:comment_id', authRequired, CommentController.remove); //corrected
export default r;
