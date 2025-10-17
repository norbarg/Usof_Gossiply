import { Users } from '../models/UserModel.js';
import { hashPassword } from '../utils/password.js';
import { Posts } from '../models/PostModel.js';
import { pool } from '../config/db.js';

const ALLOWED_ROLES = new Set(['user', 'admin']);

export const UserController = {
    async getAll(req, res) {
        const users = await Users.all();
        res.json(users);
    },
    async getById(req, res) {
        const id = +req.params.user_id;
        const user = await Users.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    },
    async create(req, res) {
        const {
            login,
            password,
            password_confirmation,
            email,
            full_name,
            role = 'user',
        } = req.body;

        if (
            !login ||
            !password ||
            !password_confirmation ||
            !email ||
            !full_name
        ) {
            return res.status(400).json({
                error: 'Missing fields: login, password, password_confirmation, email, full_name are required',
            });
        }
        if (password !== password_confirmation) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        if (!ALLOWED_ROLES.has(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const existingByLogin = await Users.findByLoginOrEmail(login);
        if (existingByLogin && existingByLogin.login === login) {
            return res.status(409).json({ error: 'Login already taken' });
        }
        const existingByEmail = await Users.findByLoginOrEmail(email);
        if (existingByEmail && existingByEmail.email === email) {
            return res.status(409).json({ error: 'Email already taken' });
        }

        const password_hash = await hashPassword(password);
        const email_verified = req.user?.role === 'admin' ? 1 : 0;

        const user = await Users.create({
            login,
            password_hash,
            full_name,
            email,
            role,
            email_verified,
        });

        return res.status(201).json(user);
    },
    async update(req, res) {
        const id = +req.params.user_id;
        if (req.user.role !== 'admin' && req.user.id !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const baseAllowed = ['full_name', 'login', 'profile_picture'];
        const allowed =
            req.user.role === 'admin' ? [...baseAllowed, 'role'] : baseAllowed;

        const data = {};

        // full_name
        if ('full_name' in req.body) {
            const v = String(req.body.full_name || '').trim();
            if (v.length < 2)
                return res.status(400).json({ error: 'Full name too short' });
            data.full_name = v;
        }

        // login: формат + уникальность
        if ('login' in req.body) {
            const v = String(req.body.login || '').trim();
            if (!/^[a-zA-Z0-9_.]{3,20}$/.test(v)) {
                return res.status(400).json({ error: 'Invalid login format' });
            }
            const existing = await Users.findByLogin(v);
            if (existing && existing.id !== id) {
                return res.status(409).json({ error: 'Login already taken' });
            }
            data.login = v;
        }

        // profile_picture (обычно меняется через /users/avatar, но оставим совместимость)
        if ('profile_picture' in req.body) {
            data.profile_picture = String(
                req.body.profile_picture || ''
            ).trim();
        }

        // role — только админ
        if ('role' in req.body) {
            if (req.user.role !== 'admin')
                return res.status(403).json({ error: 'Forbidden' });
            const nextRole = String(req.body.role || 'user');
            if (!['user', 'admin'].includes(nextRole)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            data.role = nextRole;
        }

        const updated = await Users.updateById(id, data);
        res.json(updated);
    },
    async uploadAvatar(req, res) {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        const updated = await Users.updateById(req.user.id, {
            profile_picture: `/${req.file.path}`,
        });
        res.json({
            message: 'Avatar updated',
            profile_picture: updated.profile_picture,
        });
    },
    async remove(req, res) {
        const id = +req.params.user_id;
        if (req.user.role !== 'admin' && req.user.id !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await Users.deleteById(id);
        res.json({ message: 'User deleted' });
    },
    async listMyPosts(req, res) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'likes',
            category_id,
            date_from,
            date_to,
        } = req.query;

        const offset = (Math.max(1, +page) - 1) * +limit;

        const posts = await Posts.list({
            limit: +limit,
            offset,
            sortBy,
            category_id,
            date_from,
            date_to,
            author_id: req.user.id,
            viewer_id: req.user.id,
        });

        res.json(posts);
    },
    // ✨ статистика для себя
    async statsMe(req, res) {
        const data = await getUserStats({
            targetUserId: req.user.id,
            viewer: req.user,
        });
        res.json(data);
    },

    // ✨ статистика по :user_id
    async statsById(req, res) {
        const uid = Number(req.params.user_id);
        if (!Number.isFinite(uid))
            return res.status(400).json({ error: 'Invalid user id' });
        const data = await getUserStats({
            targetUserId: uid,
            viewer: req.user || null,
        });
        res.json(data);
    },
};

// ✨ хелпер
async function getUserStats({ targetUserId, viewer }) {
    const canSeeAll =
        !!viewer && (viewer.role === 'admin' || viewer.id === targetUserId);

    // posts: либо все, либо только active
    const [postRows] = await pool.query(
        canSeeAll
            ? `SELECT COUNT(*) AS total FROM posts WHERE author_id = :id`
            : `SELECT COUNT(*) AS total FROM posts WHERE author_id = :id AND status = 'active'`,
        { id: targetUserId }
    );
    const posts = Number(postRows[0]?.total ?? 0);

    // favorites: сколько пользователь добавил в избранное
    const [favRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM favorites WHERE user_id = :id`,
        { id: targetUserId }
    );
    const favorites = Number(favRows[0]?.total ?? 0);

    // rating: лежит в users.rating
    const [uRows] = await pool.query(
        `SELECT rating FROM users WHERE id = :id`,
        { id: targetUserId }
    );
    const rating = Number(uRows[0]?.rating ?? 0);

    return { posts, favorites, rating };
}
