import { Comments } from '../models/CommentModel.js';
import { Posts } from '../models/PostModel.js';
import { Likes } from '../models/LikeModel.js';
import { pool } from '../config/db.js';

export const CommentController = {
    async getById(req, res) {
        const id = +req.params.comment_id;
        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });
        if (
            c.status === 'inactive' &&
            req.user?.role !== 'admin' &&
            req.user?.id !== c.author_id
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(c);
    },
    async likeList(req, res) {
        const id = +req.params.comment_id;
        const likes = await Likes.listForComment(id);
        res.json(likes);
    },
    async likeCreate(req, res) {
        const id = +req.params.comment_id;
        const { type = 'like' } = req.body;
        if (!['like', 'dislike'].includes(type)) {
            return res.status(400).json({ error: 'type must be like|dislike' });
        }
        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });

        if (c.status !== 'active') {
            return res
                .status(403)
                .json({ error: 'Cannot react to inactive comment' });
        }

        const [rows] = await pool.query(
            `SELECT id, type FROM likes
       WHERE author_id = :aid AND comment_id = :cid AND post_id IS NULL
       LIMIT 1`,
            { aid: req.user.id, cid: id }
        );
        const existing = rows[0];

        if (!existing) {
            await pool.query(
                `INSERT INTO likes (author_id, comment_id, type)
         VALUES (:aid, :cid, :type)`,
                { aid: req.user.id, cid: id, type }
            );
            await updateUserRating(c.author_id);
            return res
                .status(201)
                .json({ message: 'Reaction created', comment_id: id, type });
        }

        if (existing.type === type) {
            await updateUserRating(c.author_id);
            return res
                .status(200)
                .json({ message: 'Reaction unchanged', comment_id: id, type });
        }

        await pool.query(`UPDATE likes SET type = :type WHERE id = :id`, {
            type,
            id: existing.id,
        });
        await updateUserRating(c.author_id);
        return res
            .status(200)
            .json({ message: 'Reaction switched', comment_id: id, type });
    },
    async likeDelete(req, res) {
        const id = +req.params.comment_id;
        await Likes.removeForComment({
            author_id: req.user.id,
            comment_id: id,
        });
        const c = await Comments.findById(id);
        if (c) await updateUserRating(c.author_id);
        res.json({ message: 'Like removed' });
    },
    async createUnderPost(req, res) {
        const post_id = +req.params.post_id;
        const post = await Posts.findById(post_id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.status !== 'active')
            return res
                .status(403)
                .json({ error: 'Cannot comment inactive post' });
        const { content } = req.body;
        if (!content)
            return res.status(400).json({ error: 'content required' });
        const comment = await Comments.create({
            post_id,
            author_id: req.user.id,
            content,
        });
        res.status(201).json(comment);
    },
    async update(req, res) {
        const id = +req.params.comment_id;
        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });

        const isAuthor = req.user.id === c.author_id;
        const isAdmin = req.user.role === 'admin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const data = {};
        if (isAuthor) {
            if ('content' in req.body) data.content = req.body.content;
            if ('status' in req.body) data.status = req.body.status;
        } else if (isAdmin) {
            if ('status' in req.body) data.status = req.body.status;
        }

        if (!Object.keys(data).length) {
            return res
                .status(400)
                .json({ error: 'No allowed fields to update' });
        }

        const updated = await Comments.updateById(id, data);
        res.json(updated);
    },
    async remove(req, res) {
        const id = +req.params.comment_id;
        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });
        if (req.user.id !== c.author_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await Comments.deleteById(id);
        res.json({ message: 'Comment deleted' });
    },
};

async function updateUserRating(user_id) {
    const [postSum] = await pool.query(
        `SELECT COALESCE(SUM(CASE 
        WHEN l.type='like' THEN 1 
        WHEN l.type='dislike' THEN -1 
        ELSE 0 END), 0) AS s
     FROM posts p
     INNER JOIN likes l ON l.post_id = p.id
     WHERE p.author_id = :user_id`,
        { user_id }
    );

    const [commentSum] = await pool.query(
        `SELECT COALESCE(SUM(CASE 
        WHEN l.type='like' THEN 1 
        WHEN l.type='dislike' THEN -1 
        ELSE 0 END), 0) AS s
     FROM comments c
     INNER JOIN likes l ON l.comment_id = c.id
     WHERE c.author_id = :user_id`,
        { user_id }
    );

    const ps = Number(postSum[0]?.s ?? 0);
    const cs = Number(commentSum[0]?.s ?? 0);
    const rating = ps + cs;

    await pool.query(`UPDATE users SET rating = :rating WHERE id = :user_id`, {
        rating,
        user_id,
    });
}
