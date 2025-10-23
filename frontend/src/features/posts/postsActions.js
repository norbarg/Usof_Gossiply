import api from '../../shared/api/axios';

export const POSTS_LOADING = 'posts/LOADING';
export const POSTS_ERROR = 'posts/ERROR';
export const POSTS_SET = 'posts/SET';
export const POSTS_APPEND = 'posts/APPEND';
export const POSTS_SET_META = 'posts/SET_META';
export const POST_SET_ONE = 'posts/SET_ONE';

export const POSTS_SET_FAV_IDS = 'posts/SET_FAV_IDS';

const setLoading = (v) => ({ type: POSTS_LOADING, payload: v });
const setError = (e) => ({ type: POSTS_ERROR, payload: e });
const setList = (items) => ({ type: POSTS_SET, payload: items });
const appendList = (items) => ({ type: POSTS_APPEND, payload: items });
const setMeta = (meta) => ({ type: POSTS_SET_META, payload: meta });
export const setOne = (post) => ({ type: POST_SET_ONE, payload: post });
const setFavIds = (ids) => ({ type: POSTS_SET_FAV_IDS, payload: ids });

export const listPosts =
    (params = {}) =>
    async (dispatch) => {
        const { append = false } = params;
        dispatch(setLoading(true));
        const {
            page = 1,
            limit = 10,
            category_id,
            category_ids,
            q,
            date_from,
            date_to,
            status,
        } = params;

        const offset = (page - 1) * limit;
        const sortBy = String(params.sortBy ?? params.sort ?? 'likes_desc');

        try {
            const { data, headers } = await api.get('/posts', {
                params: {
                    sortBy,
                    sort: sortBy,
                    category_id,
                    category_ids,
                    q,
                    date_from,
                    date_to,
                    status,
                    page,
                    limit,
                    per_page: limit,
                    offset,
                    skip: offset,
                    take: limit,
                },
            });

            let items, total;

            if (Array.isArray(data)) {
                items = data;
                total = Number(headers?.['x-total-count']) || items.length;
            } else if (data?.items) {
                items = data.items;
                total = Number(
                    data.total ?? data.count ?? data.meta?.total ?? items.length
                );
            } else if (data?.results) {
                items = data.results;
                total = Number(data.count ?? data.total ?? items.length);
            } else if (data?.data && data?.meta) {
                items = data.data;
                total = Number(
                    data.meta.total ?? data.meta.count ?? items.length
                );
            } else {
                items = data?.rows || data?.list || [];
                total = Number(data?.total ?? data?.count ?? items.length);
            }

            if (append) {
                dispatch(appendList(items));
            } else {
                dispatch(setList(items));
            }
            dispatch(
                setMeta({ page, limit, total, sort: sortBy, category_id, q })
            );
        } catch (e) {
            dispatch(
                setError(e?.response?.data?.error || 'Failed to load posts')
            );
            throw e;
        } finally {
            dispatch(setLoading(false));
        }
    };

export const fetchPost = (id) => async (dispatch) => {
    const postId = Number(id);
    if (!Number.isFinite(postId)) {
        return false;
    }
    dispatch(setLoading(true));
    try {
        const { data } = await api.get(`/posts/${postId}`);
        dispatch(setOne(data));
        return true;
    } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
            dispatch(setOne(null));
            dispatch(setError(null));
            return false;
        }
        dispatch(setError(e?.response?.data?.error || 'Failed to load post'));
        return false;
    } finally {
        dispatch(setLoading(false));
    }
};

export const toggleReaction =
    (postId, nextType /* 'like' | 'dislike' */) =>
    async (dispatch, getState) => {
        const { posts } = getState();
        const post = posts.items.find((p) => p.id === postId) || posts.current;
        if (!post) return;

        const current =
            post.my_reaction ||
            (post.liked ? 'like' : post.disliked ? 'dislike' : null);
        let likesUp = Number(post.likes_up_count ?? 0);
        let likesDown = Number(post.likes_down_count ?? 0);

        let patch = {};

        if (current === nextType) {
            if (nextType === 'like') likesUp = Math.max(0, likesUp - 1);
            if (nextType === 'dislike') likesDown = Math.max(0, likesDown - 1);
            patch = {
                my_reaction: null,
                liked: false,
                disliked: false,
                likes_up_count: likesUp,
                likes_down_count: likesDown,
                likes_count: likesUp - likesDown,
            };

            dispatch(setOne({ ...post, ...patch }));
            try {
                await api.delete(`/posts/${postId}/like`);
            } catch (e) {
                dispatch(setOne(post));
                throw e;
            }
            return;
        }

        if (nextType === 'like') {
            if (current === 'dislike') likesDown = Math.max(0, likesDown - 1);
            likesUp += 1;
            patch = {
                my_reaction: 'like',
                liked: true,
                disliked: false,
                likes_up_count: likesUp,
                likes_down_count: likesDown,
                likes_count: likesUp - likesDown,
            };
        } else {
            if (current === 'like') likesUp = Math.max(0, likesUp - 1);
            likesDown += 1;
            patch = {
                my_reaction: 'dislike',
                liked: false,
                disliked: true,
                likes_up_count: likesUp,
                likes_down_count: likesDown,
                likes_count: likesUp - likesDown,
            };
        }

        dispatch(setOne({ ...post, ...patch }));
        try {
            await api.post(`/posts/${postId}/like`, { type: nextType });
        } catch (e) {
            dispatch(setOne(post));
            throw e;
        }
    };

export const toggleLike = (postId) => toggleReaction(postId, 'like');

export const toggleDislike = (postId) => toggleReaction(postId, 'dislike');

export const toggleFavorite =
    (postId, opts = {}) =>
    async (dispatch, getState) => {
        const { posts } = getState();
        const postInStore =
            posts.items.find((p) => p.id === postId) || posts.current || null;

        const wasFavorited = postInStore?.favorited ?? !!opts.currentFavorited;
        const next = !wasFavorited;

        if (postInStore) dispatch(setOne({ ...postInStore, favorited: next }));

        const prevIds = posts.favoriteIds || [];
        const nextIds = next
            ? Array.from(new Set([...prevIds, postId]))
            : prevIds.filter((id) => id !== postId);
        dispatch(setFavIds(nextIds));

        try {
            if (next) await api.post(`/posts/${postId}/favorite`);
            else await api.delete(`/posts/${postId}/favorite`);
        } catch (e) {
            if (postInStore)
                dispatch(setOne({ ...postInStore, favorited: wasFavorited }));
            dispatch(setFavIds(prevIds));
            throw e;
        }
    };

export const loadMyFavoriteIds = () => async (dispatch, getState) => {
    try {
        const { auth } = getState();
        if (!auth?.token) return;

        const { data } = await api.get('/users/me/favorites', {
            params: { page: 1, limit: 1000 },
        });
        const rows = Array.isArray(data)
            ? data
            : data.items ?? data.results ?? data.data ?? [];
        const ids = (rows || []).map((r) => r.id);
        dispatch(setFavIds(ids));
    } catch (_) {}
};
export const createPost =
    ({
        title,
        contentBlocks = [],
        categories = [],
        desiredStatus = 'active',
    }) =>
    async (dispatch, getState) => {
        try {
            const body = {
                title,
                content: contentBlocks,
                categories: categories.map((c) => +c).filter(Boolean),
            };
            const { data } = await api.post('/posts', body);
            dispatch(setOne(data));

            if (desiredStatus === 'inactive') {
                try {
                    const { auth } = getState();
                    if (auth?.user?.role === 'admin') {
                        const upd = await api.patch(`/posts/${data.id}`, {
                            status: 'inactive',
                        });
                        dispatch(setOne(upd.data));
                        return upd.data;
                    }
                } catch (_) {}
            }
            return data;
        } catch (e) {
            throw e?.response?.data?.error || e;
        }
    };
export const deletePost = (postId) => async (dispatch, getState) => {
    await api.delete(`/posts/${postId}`);
    const { posts } = getState();
    const nextItems = (posts.items || []).filter((p) => p.id !== postId);
    dispatch(setList(nextItems));
    dispatch(setOne(null));
    return true;
};

export const updatePost =
    ({ id, title, contentBlocks, categories, status }) =>
    async (dispatch, getState) => {
        const body = {};
        if (title !== undefined) body.title = title;
        if (contentBlocks !== undefined) body.content = contentBlocks;
        if (Array.isArray(categories)) {
            body.categories = categories.map((c) => +c).filter(Boolean);
        }
        if (status !== undefined) body.status = status;

        const { data } = await api.patch(`/posts/${id}`, body);

        dispatch(setOne(data));
        const { posts } = getState();
        const items = posts.items || [];
        const idx = items.findIndex((p) => p.id === id);
        if (idx !== -1) {
            const copy = items.slice();
            copy[idx] = { ...copy[idx], ...data };
            dispatch(setList(copy));
        }
        return data;
    };
