import { Comments } from '../models/CommentModel.js';
import { Posts } from '../models/PostModel.js';
import { Likes } from '../models/LikeModel.js';
import { pool } from '../config/db.js';
import { broadcastCommentEvent } from '../utils/commentsStream.js';

function normalizeUploadPath(s) {
    if (!s) return s;
    let u = String(s).trim().replace(/\\/g, '/');
    u = u.replace(/^\/api(\/|$)/i, '/');
    u = u.replace(/^(\/)?uploads(?=[^/])/i, '/uploads/');
    u = u.replace(/^\/?uploads\/+/i, '/uploads/');
    if (/^uploads\//i.test(u)) u = '/' + u;
    u = u.replace(/^\/uploads\/avatars(?=\d)/i, '/uploads/avatars/');
    return u;
}

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
        const id = Number(req.params.comment_id);
        const { type = 'like' } = req.body || {};

        if (!Number.isFinite(id)) {
            return res
                .status(400)
                .json({ error: 'comment_id must be a number' });
        }
        if (!['like', 'dislike'].includes(type)) {
            return res.status(400).json({ error: 'type must be like|dislike' });
        }
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });
        if (c.status !== 'active') {
            return res
                .status(403)
                .json({ error: 'Cannot react to inactive comment' });
        }

        try {
            await pool.query(
                `INSERT INTO likes (author_id, comment_id, type)
       VALUES (:aid, :cid, :type)
       ON DUPLICATE KEY UPDATE type = VALUES(type)`,
                { aid: req.user.id, cid: id, type }
            );
        } catch (e) {
            console.error('likeCreate error:', e);
            return res.status(500).json({ error: 'Failed to save reaction' });
        }

        try {
            await updateUserRating(c.author_id);
        } catch (e) {
            console.warn('updateUserRating failed:', e);
        }
        const counters = await getReactionsCounters(id);
        broadcastCommentEvent(c.post_id, { type: 'reaction', id, ...counters });

        return res.status(200).json({ message: 'OK', comment_id: id, type });
    },
    async likeDelete(req, res) {
        const id = Number(req.params.comment_id);
        if (!Number.isFinite(id))
            return res
                .status(400)
                .json({ error: 'comment_id must be a number' });
        if (!req.user?.id)
            return res.status(401).json({ error: 'Unauthorized' });

        await Likes.removeForComment({
            author_id: req.user.id,
            comment_id: id,
        });

        try {
            const c = await Comments.findById(id);
            if (c) await updateUserRating(c.author_id);
        } catch (e) {
            console.warn('updateUserRating after delete failed:', e);
        }
        const c = await Comments.findById(id);
        if (c) {
            const counters = await getReactionsCounters(id);
            broadcastCommentEvent(c.post_id, {
                type: 'reaction',
                id,
                ...counters,
            });
        }
        return res.status(200).json({ message: 'OK' });
    },
    async createUnderPost(req, res) {
        const post_id = +req.params.post_id;
        const post = await Posts.findById(post_id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.status !== 'active')
            return res
                .status(403)
                .json({ error: 'Cannot comment inactive post' });
        const { content, parent_id } = req.body;
        if (!content)
            return res.status(400).json({ error: 'content required' });
        let parent = null;
        if (parent_id != null) {
            const pid = +parent_id;
            if (!Number.isFinite(pid))
                return res
                    .status(400)
                    .json({ error: 'parent_id must be a number' });
            parent = await Comments.findById(pid);
            if (!parent)
                return res
                    .status(404)
                    .json({ error: 'Parent comment not found' });
            if (parent.post_id !== post_id)
                return res.status(400).json({
                    error: 'Parent comment belongs to a different post',
                });
            if (parent.status !== 'active')
                return res
                    .status(403)
                    .json({ error: 'Cannot reply to inactive comment' });
        }
        const comment = await Comments.create({
            post_id,
            author_id: req.user.id,
            content,
            parent_id: parent ? parent.id : null,
        });
        const full = await Comments.findByIdWithAuthor(comment.id);
        res.status(201).json(full);
        broadcastCommentEvent(post_id, { type: 'created', comment: full });
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
        if ('status' in data) {
            broadcastCommentEvent(updated.post_id, {
                type: 'status',
                id,
                status: updated.status,
            });
        } else if ('content' in data) {
            broadcastCommentEvent(updated.post_id, {
                type: 'updated',
                comment: updated,
            });
        }
    },
    async adminList(req, res) {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));
        const offset = (page - 1) * limit;

        const q = String(req.query.q || '').trim();
        const status = String(req.query.status || 'all');

        const where = [];
        const params = {};

        if (status === 'active' || status === 'inactive') {
            where.push('c.status = :status');
            params.status = status;
        }
        if (q) {
            where.push(
                '(c.content LIKE :q OR u.login LIKE :q OR u.email LIKE :q)'
            );
            params.q = `%${q}%`;
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const orderSql = 'ORDER BY c.publish_date DESC, c.id DESC';

        const [rows] = await pool.query(
            `SELECT
       c.id, c.post_id, c.author_id, c.content, c.status, c.parent_id,
       c.publish_date AS created_at,
       COALESCE((SELECT COUNT(*) FROM likes l WHERE l.comment_id=c.id AND l.type='like'),0)    AS likes_up_count,
       COALESCE((SELECT COUNT(*) FROM likes l WHERE l.comment_id=c.id AND l.type='dislike'),0) AS likes_down_count,
       u.login AS author_login,
       u.full_name AS author_name,
       u.profile_picture AS author_avatar
     FROM comments c
     JOIN users u ON u.id = c.author_id
     ${whereSql}
     ${orderSql}
     LIMIT :limit OFFSET :offset`,
            { ...params, limit, offset }
        );

        const [[countRow]] = await pool.query(
            `SELECT COUNT(*) AS total
     FROM comments c
     JOIN users u ON u.id = c.author_id
     ${whereSql}`,
            params
        );

        const items = rows.map((r) => ({
            ...r,
            author_avatar: normalizeUploadPath(r.author_avatar),
            likes_up_count: Number(r.likes_up_count || 0),
            likes_down_count: Number(r.likes_down_count || 0),
        }));

        const total = Number(countRow?.total || 0);
        res.json({
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    },

    async remove(req, res) {
        const id = +req.params.comment_id;
        const c = await Comments.findById(id);
        if (!c) return res.status(404).json({ error: 'Comment not found' });
        const isAuthor = req.user.id === c.author_id;
        const isAdmin = req.user.role === 'admin';
        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await Comments.deleteById(id);
        res.json({ message: 'Comment deleted' });
        broadcastCommentEvent(c.post_id, { type: 'deleted', id });
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
async function getReactionsCounters(comment_id) {
    const [[up]] = await pool.query(
        `SELECT COUNT(*) AS c FROM likes WHERE comment_id=:id AND type='like'`,
        { id: comment_id }
    );
    const [[down]] = await pool.query(
        `SELECT COUNT(*) AS c FROM likes WHERE comment_id=:id AND type='dislike'`,
        { id: comment_id }
    );
    return {
        likes_up_count: Number(up?.c || 0),
        likes_down_count: Number(down?.c || 0),
    };
}
