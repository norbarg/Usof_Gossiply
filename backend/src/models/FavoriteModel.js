import { BaseModel } from './BaseModel.js';

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
            sortBy === 'likes'
                ? 'COALESCE(lc.like_count,0) DESC'
                : 'p.publish_date DESC';

        return this.query(
            `SELECT p.*, COALESCE(lc.like_count,0) AS like_count
       FROM favorites f
       JOIN posts p ON p.id = f.post_id
       LEFT JOIN (
         SELECT post_id, SUM(CASE WHEN type='like' THEN 1 ELSE -1 END) AS like_count
         FROM likes WHERE comment_id IS NULL GROUP BY post_id
       ) lc ON lc.post_id = p.id
      WHERE f.user_id = :user_id
      ORDER BY ${order}
      LIMIT :limit OFFSET :offset`,
            { user_id, limit: +limit, offset: +offset }
        );
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
