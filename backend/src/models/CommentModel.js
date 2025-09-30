import { BaseModel } from './BaseModel.js';

export class CommentModel extends BaseModel {
    constructor() {
        super('comments');
    }
    async create({ post_id, author_id, content, status = 'active' }) {
        const res = await this.query(
            `INSERT INTO comments (post_id, author_id, content, status) VALUES (:post_id, :author_id, :content, :status)`,
            { post_id, author_id, content, status }
        );
        return this.findById(res.insertId);
    }
    async findById(id) {
        const rows = await this.query(`SELECT * FROM comments WHERE id = :id`, {
            id,
        });
        return rows[0] || null;
    }
    async listByPost({ post_id, include_inactive = false }) {
        const where = include_inactive
            ? `post_id = :post_id`
            : `post_id = :post_id AND status='active'`;
        return this.query(
            `SELECT * FROM comments WHERE ${where} ORDER BY publish_date ASC`,
            { post_id }
        );
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
        return this.query(
            `SELECT * FROM comments
       WHERE post_id = :post_id
         AND (status = 'active' OR (status = 'inactive' AND author_id = :viewer_id))
       ORDER BY publish_date ASC`,
            { post_id, viewer_id }
        );
    }
}
export const Comments = new CommentModel();
