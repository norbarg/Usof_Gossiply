import { Users } from '../models/UserModel.js';
import { hashPassword } from '../utils/password.js';
import { Posts } from '../models/PostModel.js';

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
        const user = await Users.create({
            login,
            password_hash,
            full_name,
            email,
            role,
        });

        return res.status(201).json(user);
    },
    async update(req, res) {
        const id = +req.params.user_id;
        if (req.user.role !== 'admin' && req.user.id !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const allowed = ['full_name', 'email', 'role', 'profile_picture'];
        const data = {};
        for (const k of allowed) if (k in req.body) data[k] = req.body[k];
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
};
