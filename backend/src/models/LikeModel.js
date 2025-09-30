import { BaseModel } from './BaseModel.js';

export class LikeModel extends BaseModel {
  constructor() { super('likes'); }
  async addForPost({ author_id, post_id, type }) {
    const res = await this.query(
      `INSERT INTO likes (author_id, post_id, type) VALUES (:author_id, :post_id, :type)`,
      { author_id, post_id, type }
    );
    return this.findById(res.insertId);
  }
  async addForComment({ author_id, comment_id, type }) {
    const res = await this.query(
      `INSERT INTO likes (author_id, comment_id, type) VALUES (:author_id, :comment_id, :type)`,
      { author_id, comment_id, type }
    );
    return this.findById(res.insertId);
  }
  async findById(id) {
    const rows = await this.query(`SELECT * FROM likes WHERE id = :id`, { id });
    return rows[0] || null;
  }
  async listForPost(post_id) {
    return this.query(`SELECT * FROM likes WHERE post_id = :post_id`, { post_id });
  }
  async listForComment(comment_id) {
    return this.query(`SELECT * FROM likes WHERE comment_id = :comment_id`, { comment_id });
  }
  async removeForPost({ author_id, post_id }) {
    await this.query(`DELETE FROM likes WHERE author_id = :author_id AND post_id = :post_id`, { author_id, post_id });
    return true;
  }
  async removeForComment({ author_id, comment_id }) {
    await this.query(`DELETE FROM likes WHERE author_id = :author_id AND comment_id = :comment_id`, { author_id, comment_id });
    return true;
  }
}
export const Likes = new LikeModel();
