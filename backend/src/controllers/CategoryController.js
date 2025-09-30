import { Categories } from '../models/CategoryModel.js';
import { pool } from '../config/db.js';

export const CategoryController = {
    async list(req, res) {
        res.json(await Categories.all());
    },
    async getById(req, res) {
        const id = +req.params.category_id;
        const cat = await Categories.findById(id);
        if (!cat) return res.status(404).json({ error: 'Category not found' });
        res.json(cat);
    },
    async posts(req, res) {
        const id = +req.params.category_id;
        const [rows] = await pool.query(
            `SELECT p.* FROM post_categories pc JOIN posts p ON p.id = pc.post_id WHERE pc.category_id = :id`,
            { id }
        );
        const filtered =
            req.user && req.user.role === 'admin'
                ? rows
                : rows.filter((p) => p.status === 'active');
        res.json(filtered);
    },
    async create(req, res) {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ error: 'title required' });
        try {
            const c = await Categories.create({ title, description });
            res.status(201).json(c);
        } catch (e) {
            res.status(409).json({ error: 'Category already exists' });
        }
    },
    async update(req, res) {
        const id = +req.params.category_id;
        const updated = await Categories.updateById(id, req.body);
        res.json(updated);
    },
    async remove(req, res) {
        const id = +req.params.category_id;
        await Categories.deleteById(id);
        res.json({ message: 'Category deleted' });
    },
};
