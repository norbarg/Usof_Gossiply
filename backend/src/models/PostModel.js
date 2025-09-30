import { BaseModel } from './BaseModel.js';

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
        category_id,
        sortBy = 'likes',
        date_from,
        date_to,
        viewer_id,
        include_all = false,
    }) {
        let where = [];
        const params = { limit: +limit, offset: +offset };

        if (include_all) {
            if (status) {
                where.push(`p.status = :status`);
                params.status = status;
            }
        } else {
            if (status) {
                where.push(`p.status = :status`);
                params.status = status;
            } else if (viewer_id) {
                where.push(
                    `(p.status = 'active' OR (p.status = 'inactive' AND p.author_id = :viewer_id))`
                );
                params.viewer_id = viewer_id;
            } else {
                where.push(`p.status = 'active'`);
            }
        }
        if (author_id) {
            where.push(`p.author_id = :author_id`);
            params.author_id = author_id;
        }
        if (category_id) {
            where.push(
                `EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.id AND pc.category_id = :category_id)`
            );
            params.category_id = category_id;
        }
        if (date_from) {
            where.push(`p.publish_date >= :date_from`);
            params.date_from = date_from;
        }
        if (date_to) {
            where.push(`p.publish_date <= :date_to`);
            params.date_to = date_to;
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const order =
            sortBy === 'date'
                ? 'p.publish_date DESC'
                : 'COALESCE(lc.like_count,0) DESC';
        const sql = `
      SELECT p.*, COALESCE(lc.like_count,0) AS like_count
      FROM posts p
      LEFT JOIN (
        SELECT post_id, SUM(CASE WHEN type='like' THEN 1 ELSE -1 END) AS like_count
        FROM likes WHERE comment_id IS NULL GROUP BY post_id
      ) lc ON lc.post_id = p.id
      ${whereSql}
      ORDER BY ${order}
      LIMIT :limit OFFSET :offset
    `;
        return this.query(sql, params);
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
