import { Posts } from '../models/PostModel.js';
import { Favorites } from '../models/FavoriteModel.js';

export const FavoriteController = {
    async add(req, res) {
        const post_id = +req.params.post_id;
        const post = await Posts.findById(post_id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const isAuthor = req.user?.id === post.author_id;
        const isAdmin = req.user?.role === 'admin';
        if (post.status !== 'active' && !isAuthor && !isAdmin) {
            return res
                .status(403)
                .json({ error: 'Cannot favorite inactive post' });
        }

        const ok = await Favorites.add({ user_id: req.user.id, post_id });
        return res.status(ok ? 201 : 200).json({ message: 'Favorited' });
    },

    async remove(req, res) {
        const post_id = +req.params.post_id;
        await Favorites.remove({ user_id: req.user.id, post_id });
        res.json({ message: 'Unfavorited' });
    },

    async listMine(req, res) {
        const { page = 1, limit = 20, sortBy = 'date' } = req.query;
        const offset = (Math.max(1, +page) - 1) * +limit;
        const rows = await Favorites.listByUser({
            user_id: req.user.id,
            limit,
            offset,
            sortBy,
        });
        res.json(rows);
    },
};
