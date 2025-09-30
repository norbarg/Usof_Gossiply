import { BaseModel } from './BaseModel.js';

export class CategoryModel extends BaseModel {
    constructor() {
        super('categories');
    }
    async all() {
        return this.query(`SELECT * FROM categories ORDER BY title ASC`);
    }
    async findById(id) {
        const rows = await this.query(
            `SELECT * FROM categories WHERE id = :id`,
            { id }
        );
        return rows[0] || null;
    }
    async create({ title, description }) {
        const res = await this.query(
            `INSERT INTO categories (title, description) VALUES (:title, :description)`,
            { title, description }
        );
        return this.findById(res.insertId);
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
            `UPDATE categories SET ${fields.join(', ')} WHERE id = :id`,
            params
        );
        return this.findById(id);
    }
    async deleteById(id) {
        await this.query(`DELETE FROM categories WHERE id = :id`, { id });
        return true;
    }
}
export const Categories = new CategoryModel();
