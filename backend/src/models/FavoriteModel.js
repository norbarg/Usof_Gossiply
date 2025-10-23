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

export class FavoriteModel extends BaseModel {
    constructor() {
        super('favorites');
    }

    async add({ user_id, post_id }) {
        await this.query(
            `INSERT IGNORE INTO favorites (user_id, post_id) VALUES (:user_id, :post_id)`,
            { user_id, post_id }
        );
        const rows = await this.query(
            `SELECT 1 FROM favorites WHERE user_id = :user_id AND post_id = :post_id`,
            { user_id, post_id }
        );
        return rows.length > 0;
    }

    async remove({ user_id, post_id }) {
        await this.query(
            `DELETE FROM favorites WHERE user_id = :user_id AND post_id = :post_id`,
            { user_id, post_id }
        );
        return true;
    }

    async listByUser({ user_id, limit = 20, offset = 0, sortBy = 'date' }) {
        const order =
            sortBy === 'likes' ? 'likes_count DESC' : 'p.publish_date DESC';

        const sql = `
      SELECT
        p.id, p.author_id, p.title, p.content, p.status,
        p.publish_date AS created_at,  /* под фронт */
        p.updated_at,

        u.login           AS author_login,
        u.full_name       AS author_name,
        u.profile_picture AS author_avatar,

       COALESCE((
          SELECT SUM(CASE WHEN l.type='like' THEN 1 WHEN l.type='dislike' THEN -1 ELSE 0 END)
          FROM likes l
          WHERE l.comment_id IS NULL AND l.post_id = p.id
        ), 0) AS likes_count,

        COALESCE((
          SELECT COUNT(*) FROM favorites f2 WHERE f2.post_id = p.id
        ), 0) AS favorites_count,

        COALESCE((
          SELECT COUNT(*) FROM comments c
          WHERE c.post_id = p.id AND c.status='active'
        ), 0) AS comments_count,

        1 AS favorited, /* раз в «избранном», то true */

        (
          SELECT GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ',')
          FROM post_categories pc
          JOIN categories c ON c.id = pc.category_id
          WHERE pc.post_id = p.id
        ) AS categories_csv

      FROM favorites f
      JOIN posts p  ON p.id = f.post_id
      JOIN users u  ON u.id = p.author_id
      WHERE f.user_id = :user_id
      ORDER BY ${order}
      LIMIT :limit OFFSET :offset
    `;

        const rows = await this.query(sql, {
            user_id,
            limit: +limit,
            offset: +offset,
        });

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
                favorited: true,
            };
        });
    }

    async isFavorited({ user_id, post_id }) {
        const rows = await this.query(
            `SELECT 1 FROM favorites WHERE user_id = :user_id AND post_id = :post_id`,
            { user_id, post_id }
        );
        return rows.length > 0;
    }
}

export const Favorites = new FavoriteModel();
