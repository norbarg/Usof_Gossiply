import { BaseModel } from './BaseModel.js';

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

export class CommentModel extends BaseModel {
    constructor() {
        super('comments');
    }
    async create({
        post_id,
        author_id,
        content,
        parent_id = null,
        status = 'active',
    }) {
        const res = await this.query(
            `INSERT INTO comments (post_id, author_id, content, parent_id, status)
             VALUES (:post_id, :author_id, :content, :parent_id, :status)`,
            { post_id, author_id, content, parent_id, status }
        );
        return this.findById(res.insertId);
    }
    async findById(id) {
        const rows = await this.query(`SELECT * FROM comments WHERE id = :id`, {
            id,
        });
        return rows[0] || null;
    }
    async findByIdWithAuthor(id) {
        const rows = await this.query(
            `SELECT
         c.id, c.post_id, c.author_id, c.content, c.status,
         c.parent_id,
         c.publish_date AS created_at,
         /* раздельные счётчики реакций */
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='like'), 0)    AS likes_up_count,
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='dislike'), 0) AS likes_down_count,
         /* моя реакция (viewer_id проставим 0 в этом методе — он без контекста пользователя) */
         NULL AS my_reaction,
         u.login AS author_login,
         u.full_name AS author_name,
         u.profile_picture AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.id = :id
       LIMIT 1`,
            { id }
        );
        const r = rows[0];
        if (!r) return null;
        const my = r.my_reaction || null;
        return {
            ...r,
            author_avatar: normalizeUploadPath(r.author_avatar),
            my_reaction: my,
            liked: my === 'like',
            disliked: my === 'dislike',
            likes_up_count: Number(r.likes_up_count || 0),
            likes_down_count: Number(r.likes_down_count || 0),
        };
    }
    async listByPost({ post_id, include_inactive = false, viewer_id = 0 }) {
        const where = include_inactive
            ? `c.post_id = :post_id`
            : `c.post_id = :post_id AND c.status='active'`;
        const rows = await this.query(
            `SELECT
         c.id, c.post_id, c.author_id, c.content, c.status,
         c.parent_id,
         c.publish_date AS created_at,
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='like'), 0)    AS likes_up_count,
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='dislike'), 0) AS likes_down_count,
         (SELECT l.type FROM likes l
            WHERE l.comment_id = c.id AND l.author_id = :viewer_id
            LIMIT 1) AS my_reaction,
         u.login AS author_login,
         u.full_name AS author_name,
         u.profile_picture AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE ${where}
       ORDER BY (c.parent_id IS NOT NULL), c.publish_date ASC`,
            { post_id, viewer_id: +viewer_id }
        );

        return rows.map((r) => {
            const my = r.my_reaction || null;
            return {
                ...r,
                author_avatar: normalizeUploadPath(r.author_avatar),
                my_reaction: my,
                liked: my === 'like',
                disliked: my === 'dislike',
                likes_up_count: Number(r.likes_up_count || 0),
                likes_down_count: Number(r.likes_down_count || 0),
            };
        });
    }
    async updateById(id, data) {
        const fields = [];
        const params = { id };
        for (const [k, v] of Object.entries(data)) {
            fields.push(`${k} = :${k}`);
            params[k] = v;
        }
        if (!fields.length) return this.findById(id);
        await this.query(
            `UPDATE comments SET ${fields.join(', ')} WHERE id = :id`,
            params
        );
        return this.findById(id);
    }
    async deleteById(id) {
        await this.query(`DELETE FROM comments WHERE id = :id`, { id });
        return true;
    }
    async listByPostForViewer({ post_id, viewer_id }) {
        const rows = await this.query(
            `SELECT
         c.id, c.post_id, c.author_id, c.content, c.status,
         c.parent_id,
         c.publish_date AS created_at,
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='like'), 0)    AS likes_up_count,
         COALESCE((SELECT COUNT(*) FROM likes l
                  WHERE l.comment_id = c.id AND l.type='dislike'), 0) AS likes_down_count,
         (SELECT l.type FROM likes l
            WHERE l.comment_id = c.id AND l.author_id = :viewer_id
            LIMIT 1) AS my_reaction,
         u.login AS author_login,
         u.full_name AS author_name,
         u.profile_picture AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = :post_id
         AND (c.status = 'active' OR (c.status = 'inactive' AND c.author_id = :viewer_id))
       ORDER BY (c.parent_id IS NOT NULL), c.publish_date ASC`,
            { post_id, viewer_id }
        );

        return rows.map((r) => {
            const my = r.my_reaction || null;
            return {
                ...r,
                author_avatar: normalizeUploadPath(r.author_avatar),
                my_reaction: my,
                liked: my === 'like',
                disliked: my === 'dislike',
                likes_up_count: Number(r.likes_up_count || 0),
                likes_down_count: Number(r.likes_down_count || 0),
            };
        });
    }
}
export const Comments = new CommentModel();
