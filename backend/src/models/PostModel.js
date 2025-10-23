import { BaseModel } from './BaseModel.js';
import { env } from '../config/env.js';

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

export class PostModel extends BaseModel {
    constructor() {
        super('posts');
    }
    async create({ author_id, title, content, status = 'active' }) {
        const res = await this.query(
            `INSERT INTO posts (author_id, title, content, status) 
       VALUES (:author_id, :title, :content, :status)`,
            { author_id, title, content: JSON.stringify(content), status }
        );
        return this.findById(res.insertId);
    }
    async findById(id) {
        const rows = await this.query(`SELECT * FROM posts WHERE id = :id`, {
            id,
        });
        return rows[0] || null;
    }
    async list({
        limit = 10,
        offset = 0,
        status,
        author_id,
        category_ids,
        sortBy = 'likes',
        date_from,
        date_to,
        q,
        viewer_id,
        include_all = false,
    }) {
        let where = [];
        const params = { limit: +limit, offset: +offset };
        if (viewer_id) params.viewer_id = +viewer_id;

        if (include_all) {
            if (status === 'active' || status === 'inactive') {
                where.push(`p.status = :status`);
                params.status = status;
            }
        } else {
            if (status === 'active') {
                where.push(`p.status = 'active'`);
            } else if (status === 'inactive') {
                if (viewer_id) {
                    where.push(
                        `p.status = 'inactive' AND p.author_id = :viewer_id`
                    );
                    params.viewer_id = viewer_id;
                } else {
                    where.push(`1 = 0`);
                }
            } else {
                if (viewer_id) {
                    where.push(
                        `(p.status = 'active' OR (p.status='inactive' AND p.author_id = :viewer_id))`
                    );
                    params.viewer_id = viewer_id;
                } else {
                    where.push(`p.status = 'active'`);
                }
            }
        }

        if (q) {
            params.q = `%${q.toLowerCase()}%`;
            where.push(
                `(LOWER(p.title) LIKE :q OR LOWER(CAST(p.content AS CHAR)) LIKE :q)`
            );
        }

        if (author_id) {
            where.push(`p.author_id = :author_id`);
            params.author_id = author_id;
        }
        if (Array.isArray(category_ids) && category_ids.length) {
            const ph = category_ids.map((_, i) => `:cid${i}`).join(',');
            where.push(`EXISTS (
              SELECT 1 FROM post_categories pc
              WHERE pc.post_id = p.id AND pc.category_id IN (${ph})
            )`);
            category_ids.forEach((id, i) => (params[`cid${i}`] = +id));
        }
        if (date_from) {
            where.push(`p.publish_date >= :date_from`);
            params.date_from = date_from;
        }
        if (date_to) {
            where.push(`p.publish_date <= :date_to`);
            params.date_to = date_to;
        }

        const likesExpr = `COALESCE((
  SELECT SUM(CASE WHEN l.type='like' THEN 1 WHEN l.type='dislike' THEN -1 ELSE 0 END)
  FROM likes l
  WHERE l.comment_id IS NULL AND l.post_id = p.id
), 0)`;
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const order = (() => {
            switch (sortBy) {
                case 'date_asc':
                    return 'p.publish_date ASC';
                case 'date_desc':
                    return 'p.publish_date DESC';
                case 'likes_asc':
                    return `${likesExpr} ASC`;
                case 'likes_desc':
                    return `${likesExpr} DESC`;

                default:
                    return `${likesExpr} DESC`;
            }
        })();

        const favoritedExpr = viewer_id
            ? `EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = :viewer_id) AS favorited,`
            : `0 AS favorited,`;

        const sql = `
    SELECT
      p.id, p.author_id, p.title, p.content, p.status,
      p.publish_date AS created_at,  /* алиас под фронт */
      p.updated_at,

      u.login            AS author_login,
      u.full_name        AS author_name,
      u.profile_picture  AS author_avatar,

      /* счётчики через коррелированные подзапросы */
      COALESCE((
        SELECT SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END)
        FROM likes l
        WHERE l.comment_id IS NULL AND l.post_id = p.id
      ), 0) AS likes_count,

      COALESCE((
        SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id
      ), 0) AS favorites_count,

      COALESCE((
        SELECT COUNT(*) FROM comments c
        WHERE c.post_id = p.id AND c.status = 'active'
      ), 0) AS comments_count,

      ${favoritedExpr}

      /* категории без GROUP BY */
      (
        SELECT GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ',')
        FROM post_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.post_id = p.id
      ) AS categories_csv

    FROM posts p
    JOIN users u ON u.id = p.author_id
    ${whereSql}
    ORDER BY ${order}
    LIMIT :limit OFFSET :offset
  `;

        const rows = await this.query(sql, params);

        return rows.map((r) => {
            const categories = r.categories_csv
                ? r.categories_csv.split(',').filter(Boolean)
                : [];
            const author_avatar = normalizeUploadPath(r.author_avatar);
            let plain = '';
            try {
                const blocks = Array.isArray(r.content)
                    ? r.content
                    : JSON.parse(r.content || '[]');
                plain = blocks
                    .filter((b) => b && (b.text || b.value))
                    .map((b) => b.text ?? b.value ?? '')
                    .join(' ')
                    .trim();
            } catch (_) {}

            const words = plain.split(/\s+/).filter(Boolean);
            const excerpt =
                words.slice(0, 30).join(' ') + (words.length > 30 ? '…' : '');

            return {
                ...r,
                author_avatar,
                categories,
                content_plain: plain,
                excerpt,
                liked: false,
                favorited: !!r.favorited,
            };
        });
    }

    async count({
        status,
        author_id,
        category_ids,
        date_from,
        date_to,
        q,
        viewer_id,
        include_all = false,
    }) {
        let where = [];
        const params = {};

        if (include_all) {
            if (status === 'active' || status === 'inactive') {
                where.push(`p.status = :status`);
                params.status = status;
            }
        } else {
            if (status === 'active') {
                where.push(`p.status = 'active'`);
            } else if (status === 'inactive') {
                if (viewer_id) {
                    where.push(
                        `p.status = 'inactive' AND p.author_id = :viewer_id`
                    );
                    params.viewer_id = viewer_id;
                } else {
                    where.push(`1 = 0`);
                }
            } else {
                if (viewer_id) {
                    where.push(
                        `(p.status = 'active' OR (p.status='inactive' AND p.author_id = :viewer_id))`
                    );
                    params.viewer_id = viewer_id;
                } else {
                    where.push(`p.status = 'active'`);
                }
            }
        }

        if (author_id) {
            where.push(`p.author_id = :author_id`);
            params.author_id = author_id;
        }
        if (Array.isArray(category_ids) && category_ids.length) {
            const ph = category_ids.map((_, i) => `:cid${i}`).join(',');
            where.push(`EXISTS (
      SELECT 1 FROM post_categories pc
      WHERE pc.post_id = p.id AND pc.category_id IN (${ph})
    )`);
            category_ids.forEach((id, i) => (params[`cid${i}`] = +id));
        }
        if (date_from) {
            where.push(`p.publish_date >= :date_from`);
            params.date_from = date_from;
        }
        if (date_to) {
            where.push(`p.publish_date <= :date_to`);
            params.date_to = date_to;
        }

        if (q) {
            params.q = `%${q.toLowerCase()}%`;
            where.push(
                `(LOWER(p.title) LIKE :q OR LOWER(CAST(p.content AS CHAR)) LIKE :q)`
            );
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `SELECT COUNT(*) AS total FROM posts p ${whereSql}`;
        const rows = await this.query(sql, params);
        return Number(rows[0]?.total ?? 0);
    }

    async findByIdWithFavorited(id, viewer_id = 0) {
        const likesExpr = `COALESCE((
    SELECT SUM(CASE WHEN l.type='like' THEN 1 WHEN l.type='dislike' THEN -1 ELSE 0 END)
    FROM likes l
    WHERE l.comment_id IS NULL AND l.post_id = p.id
  ), 0)`;

        const sql = `
    SELECT
      p.id, p.author_id, p.title, p.content, p.status,
      p.publish_date AS created_at,
      p.updated_at,

      u.login            AS author_login,
      u.full_name        AS author_name,
      u.profile_picture  AS author_avatar,

      ${likesExpr} AS likes_count,  /* общий “скор” (лайки - дизлайки) */

        /* раздельные счётчики */
        COALESCE((
          SELECT COUNT(*) FROM likes l
          WHERE l.comment_id IS NULL AND l.post_id = p.id AND l.type='like'
        ), 0) AS likes_up_count,
        COALESCE((
          SELECT COUNT(*) FROM likes l
          WHERE l.comment_id IS NULL AND l.post_id = p.id AND l.type='dislike'
        ), 0) AS likes_down_count,

        /* моя реакция (если залогинен) */
        (SELECT l.type
         FROM likes l
         WHERE l.comment_id IS NULL AND l.post_id = p.id AND l.author_id = :viewer_id
         LIMIT 1) AS my_reaction,

      COALESCE((SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id), 0) AS favorites_count,

      COALESCE((
        SELECT COUNT(*) FROM comments c
        WHERE c.post_id = p.id AND c.status = 'active'
      ), 0) AS comments_count,

      EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = :viewer_id) AS favorited,

      (
        SELECT GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ',')
        FROM post_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.post_id = p.id
      ) AS categories_csv

    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = :id
    LIMIT 1
  `;

        const rows = await this.query(sql, { id: +id, viewer_id: +viewer_id });
        const r = rows[0];
        if (!r) return null;

        let content = r.content;

        try {
            let v = content;
            if (
                typeof v === 'string' &&
                (v.trim().startsWith('[') || v.trim().startsWith('{'))
            ) {
                v = JSON.parse(v);
            }

            let blocks = Array.isArray(v)
                ? v
                : v && Array.isArray(v.blocks)
                ? v.blocks
                : null;

            if (blocks) {
                content = blocks.map((b) => {
                    if (!b) return b;
                    const t = String(b.type || '').toLowerCase();

                    let type = t;
                    if (t === 'text' || t === 'paragraph') type = 'p';
                    if (t === 'image' || t === 'photo' || t === 'img')
                        type = 'img';

                    let url = b.url || b.src || b.path || '';
                    if (type === 'img' && url) {
                        url = normalizeUploadPath(url);
                    }

                    const out = { ...b, type };
                    if (type === 'img') out.url = url;
                    return out;
                });
            }
        } catch (_) {}

        const author_avatar = normalizeUploadPath(r.author_avatar);
        const categories = r.categories_csv
            ? r.categories_csv.split(',').filter(Boolean)
            : [];

        const my_reaction = r.my_reaction || null;
        const liked = my_reaction === 'like';
        const disliked = my_reaction === 'dislike';
        return {
            ...r,
            content,
            favorited: !!r.favorited,
            author_avatar,
            categories,
            my_reaction,
            liked,
            disliked,
            likes_up_count: Number(r.likes_up_count || 0),
            likes_down_count: Number(r.likes_down_count || 0),
            author: {
                id: r.author_id,
                login: r.author_login,
                full_name: r.author_name,
                avatar: author_avatar,
            },
        };
    }

    async updateById(id, data) {
        const fields = [];
        const params = { id };
        for (const [k, v] of Object.entries(data)) {
            if (k === 'content') {
                fields.push(`${k} = :${k}`);
                params[k] = JSON.stringify(v);
            } else {
                fields.push(`${k} = :${k}`);
                params[k] = v;
            }
        }
        if (!fields.length) return this.findById(id);
        await this.query(
            `UPDATE posts SET ${fields.join(', ')} WHERE id = :id`,
            params
        );
        return this.findById(id);
    }

    async deleteById(id) {
        await this.query(`DELETE FROM posts WHERE id = :id`, { id });
        return true;
    }
}
export const Posts = new PostModel();
