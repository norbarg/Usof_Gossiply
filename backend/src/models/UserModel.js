import { BaseModel } from './BaseModel.js';
import { env } from '../config/env.js';

export class UserModel extends BaseModel {
    constructor() {
        super('users');
    }
    async create({
        login,
        password_hash,
        full_name,
        email,
        role = 'user',
        profile_picture = env.DEFAULT_AVATAR,
    }) {
        const rows = await this.query(
            `INSERT INTO users (login, password_hash, full_name, email, role, profile_picture) 
       VALUES (:login, :password_hash, :full_name, :email, :role, :profile_picture)`,
            { login, password_hash, full_name, email, role, profile_picture }
        );
        return {
            id: rows.insertId,
            login,
            full_name,
            email,
            role,
            profile_picture,
        };
    }
    async findByLoginOrEmail(loginOrEmail) {
        const rows = await this.query(
            `SELECT * FROM users WHERE login = :v OR email = :v LIMIT 1`,
            { v: loginOrEmail }
        );
        return rows[0] || null;
    }
    async findById(id) {
        const rows = await this.query(`SELECT * FROM users WHERE id = :id`, {
            id,
        });
        return rows[0] || null;
    }
    async all() {
        return this.query(
            `SELECT id, login, full_name, email, email_verified, role, rating, profile_picture, created_at FROM users`
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
            `UPDATE users SET ${fields.join(', ')} WHERE id = :id`,
            params
        );
        return this.findById(id);
    }
    async findByLogin(login) {
        const rows = await this.query(
            `SELECT * FROM users WHERE login = :login LIMIT 1`,
            { login }
        );
        return rows[0] || null;
    }
    async deleteById(id) {
        await this.query(`DELETE FROM users WHERE id = :id`, { id });
        return true;
    }
}
export const Users = new UserModel();
