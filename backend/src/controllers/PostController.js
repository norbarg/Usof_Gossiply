import { Posts } from '../models/PostModel.js';
import { Categories } from '../models/CategoryModel.js';
import { Comments } from '../models/CommentModel.js';
import { Likes } from '../models/LikeModel.js';
import { pool } from '../config/db.js';

export const PostController = {
    async list(req, res) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'likes',
            category_id,
            status,
            date_from,
            date_to,
        } = req.query;
        const viewer_id = req.user?.id;
        const offset = (Math.max(1, +page) - 1) * +limit;
        const posts = await Posts.list({
            limit,
            offset,
            sortBy,
            category_id,
            status,
            date_from,
            date_to,
            viewer_id,
        });
        res.json(posts);
    },
    async getById(req, res) {
        const id = +req.params.post_id;
        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (
            post.status === 'inactive' &&
            (!req.user ||
                (req.user.role !== 'admin' && req.user.id !== post.author_id))
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(post);
    },
    async create(req, res) {
        const { title, content, categories = [] } = req.body;
        if (!title || !content)
            return res
                .status(400)
                .json({ error: 'title and content required' });
        const post = await Posts.create({
            author_id: req.user.id,
            title,
            content,
            status: 'active',
        });
        if (Array.isArray(categories) && categories.length) {
            const values = categories
                .map((cid) => `(${post.id}, ${+cid})`)
                .join(',');
            await pool.query(
                `INSERT IGNORE INTO post_categories (post_id, category_id) VALUES ${values}`
            );
        }
        res.status(201).json(post);
    },
    async update(req, res) {
        const id = +req.params.post_id;
        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const isAdmin = req.user.role === 'admin';
        const isAuthor = req.user.id === post.author_id;

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const data = {};

        if (isAdmin && 'status' in req.body) {
            data.status = req.body.status;
        }

        if (isAuthor) {
            if ('title' in req.body) data.title = req.body.title;
            if ('content' in req.body) data.content = req.body.content;
        }

        if (Object.keys(data).length) {
            await Posts.updateById(id, data);
        }

        if (Array.isArray(req.body.categories)) {
            await pool.query(
                `DELETE FROM post_categories WHERE post_id = :id`,
                { id }
            );
            if (req.body.categories.length) {
                const values = req.body.categories
                    .map((cid) => `(${id}, ${+cid})`)
                    .join(',');
                await pool.query(
                    `INSERT IGNORE INTO post_categories (post_id, category_id) VALUES ${values}`
                );
            }
        }

        return res.json(await Posts.findById(id));
    },
    async remove(req, res) {
        const id = +req.params.post_id;
        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (req.user.role !== 'admin' && req.user.id !== post.author_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await Posts.deleteById(id);
        res.json({ message: 'Post deleted' });
    },
    async listCategories(req, res) {
        const id = +req.params.post_id;
        const rows = await pool.query(
            `SELECT c.* FROM post_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.post_id = :id`,
            { id }
        );
        res.json(rows[0]);
    },
    async listComments(req, res) {
        const id = +req.params.post_id;
        const include_inactive = req.user?.role === 'admin';
        const comments = await Comments.listByPost({
            post_id: id,
            include_inactive,
        });
        res.json(comments);
    },
    async listCommentsAdmin(req, res) {
        const id = +req.params.post_id;
        const comments = await Comments.listByPost({
            post_id: id,
            include_inactive: true,
        });
        res.json(comments);
    },

    async likeList(req, res) {
        const id = +req.params.post_id;
        const likes = await Likes.listForPost(id);
        res.json(likes);
    },
    async likeCreate(req, res) {
        const id = +req.params.post_id;
        const { type = 'like' } = req.body;
        if (!['like', 'dislike'].includes(type)) {
            return res.status(400).json({ error: 'type must be like|dislike' });
        }

        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        if (post.status !== 'active') {
            return res
                .status(403)
                .json({ error: 'Cannot react to inactive post' });
        }
        const [rows] = await pool.query(
            `SELECT id, type FROM likes 
     WHERE author_id = :aid AND post_id = :pid AND comment_id IS NULL 
     LIMIT 1`,
            { aid: req.user.id, pid: id }
        );
        const existing = rows[0];

        if (!existing) {
            await pool.query(
                `INSERT INTO likes (author_id, post_id, type) 
       VALUES (:aid, :pid, :type)`,
                { aid: req.user.id, pid: id, type }
            );
            await updateUserRating(post.author_id);
            return res
                .status(201)
                .json({ message: 'Reaction created', post_id: id, type });
        }

        if (existing.type === type) {
            await updateUserRating(post.author_id);
            return res
                .status(200)
                .json({ message: 'Reaction unchanged', post_id: id, type });
        }

        await pool.query(`UPDATE likes SET type = :type WHERE id = :id`, {
            type,
            id: existing.id,
        });
        await updateUserRating(post.author_id);
        return res
            .status(200)
            .json({ message: 'Reaction switched', post_id: id, type });
    },

    async likeDelete(req, res) {
        const id = +req.params.post_id;
        await Likes.removeForPost({ author_id: req.user.id, post_id: id });
        const post = await Posts.findById(id);
        if (post) await updateUserRating(post.author_id);
        res.json({ message: 'Like removed' });
    },
    async uploadImage(req, res) {
        const id = +req.params.post_id;
        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const isAuthor = req.user.id === post.author_id;
        const isAdmin = req.user.role === 'admin';
        if (!isAuthor && !isAdmin)
            return res.status(403).json({ error: 'Forbidden' });

        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });

        const url = `/${req.file.path}`.replace(/\\/g, '/');
        return res.json({ url });
    },
    async listAllAdmin(req, res) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'likes',
            category_id,
            status,
            date_from,
            date_to,
            include_all = true,
        } = req.query;
        const offset = (Math.max(1, +page) - 1) * +limit;
        const posts = await Posts.list({
            limit,
            offset,
            sortBy,
            category_id,
            status,
            date_from,
            date_to,
            include_all: true,
        });
        res.json(posts);
    },

    async getByIdAdmin(req, res) {
        const id = +req.params.post_id;
        const post = await Posts.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json(post);
    },
    async listCommentsForViewer(req, res) {
        const post_id = +req.params.post_id;
        const viewer_id = req.user.id;

        const comments = await Comments.listByPostForViewer({
            post_id,
            viewer_id,
        });
        res.json(comments);
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

    const rating = Number(postSum[0]?.s ?? 0) + Number(commentSum[0]?.s ?? 0);
    await pool.query(`UPDATE users SET rating = :rating WHERE id = :user_id`, {
        rating,
        user_id,
    });
}
