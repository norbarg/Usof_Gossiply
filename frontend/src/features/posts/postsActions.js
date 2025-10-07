// frontend/src/features/posts/postsActions.js
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

/**
 * Надёжный listPosts: отправляем сразу несколько вариантов параметров,
 * чтобы попасть в контракт бэка (page/limit, offset/limit, skip/take, per_page и т.д.).
 * Разбираем ответ в популярных форматах:
 *  - { items, total }
 *  - { results, count }
 *  - { data, meta:{ total, page, limit } }
 *  - [ ... ]  (простой массив — тогда total пока неизвестен)
 *     listPosts(params, { append=false })
 */
export const listPosts =
    (params = {}) =>
    async (dispatch) => {
        const { append = false } = params;
        dispatch(setLoading(true));
        const {
            page = 1,
            limit = 10,
            category_id, // для совместимости
            category_ids, // массив
            q,
            date_from,
            date_to,
            status, // '', 'active', 'inactive', 'all'
        } = params;

        // считаем offset из page, чтобы поддержать оба подхода
        const offset = (page - 1) * limit;
        // поддержка и sortBy, и sort
        const sortBy = String(params.sortBy ?? params.sort ?? 'likes_desc');

        try {
            const { data, headers } = await api.get('/posts', {
                params: {
                    // сортировка/фильтры как есть
                    sortBy, // <— основной
                    sort: sortBy,
                    category_id, // старый
                    category_ids, // новый (массив или строка)
                    q,
                    date_from,
                    date_to,
                    status,
                    // Варианты пагинации (пусть бэк возьмёт то, что он умеет):
                    page, // самый частый
                    limit,
                    per_page: limit, // синонимы "limit"
                    offset,
                    skip: offset, // альтернативы "offset"
                    take: limit, // ещё один частый ключ из TypeORM
                },
            });

            // Разные формы ответа
            let items, total;

            if (Array.isArray(data)) {
                items = data;
                // total: попробуем вытащить из заголовка (часто ставят X-Total-Count)
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
                // просто на всякий
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

/** загрузка детали поста */
export const fetchPost = (id) => async (dispatch) => {
    dispatch(setLoading(true));
    try {
        const { data } = await api.get(`/posts/${id}`);
        dispatch(setOne(data));
    } catch (e) {
        dispatch(setError(e?.response?.data?.error || 'Failed to load post'));
        throw e;
    } finally {
        dispatch(setLoading(false));
    }
};

/** лайк/избранное — оптимистично меняем локальный стейт */
export const toggleLike = (postId) => async (dispatch, getState) => {
    const { posts } = getState();
    const post = posts.items.find((p) => p.id === postId) || posts.current;
    if (!post) return;

    const liked = !post.liked;
    const likes_count = (post.likes_count ?? 0) + (liked ? 1 : -1);

    dispatch(setOne({ ...post, liked, likes_count })); // меняем likes_count

    try {
        // Лучше явно слать тип (бэк его понимает), а для “снять лайк” — DELETE:
        if (liked) {
            await api.post(`/posts/${postId}/like`, { type: 'like' });
        } else {
            await api.delete(`/posts/${postId}/like`);
        }
    } catch (e) {
        // откат
        dispatch(
            setOne({ ...post, liked: !liked, likes_count: post.likes_count })
        );
        throw e;
    }
};

// postsActions.js
export const toggleFavorite =
    (postId, opts = {}) =>
    async (dispatch, getState) => {
        const { posts } = getState();
        const postInStore =
            posts.items.find((p) => p.id === postId) || posts.current || null;

        const wasFavorited = postInStore?.favorited ?? !!opts.currentFavorited;
        const next = !wasFavorited;

        // оптимистичное обновление карточки
        if (postInStore) dispatch(setOne({ ...postInStore, favorited: next }));

        // оптимистично обновим ids
        const prevIds = posts.favoriteIds || [];
        const nextIds = next
            ? Array.from(new Set([...prevIds, postId]))
            : prevIds.filter((id) => id !== postId);
        dispatch(setFavIds(nextIds));

        try {
            if (next) await api.post(`/posts/${postId}/favorite`);
            else await api.delete(`/posts/${postId}/favorite`);
        } catch (e) {
            // откат карточки
            if (postInStore)
                dispatch(setOne({ ...postInStore, favorited: wasFavorited }));
            // откат ids
            dispatch(setFavIds(prevIds));
            throw e;
        }
    };

// грузим ids избранных один раз (или при входе)
export const loadMyFavoriteIds = () => async (dispatch, getState) => {
    try {
        const { auth } = getState();
        if (!auth?.token) return; // не залогинен — пропускаем

        // возьми побольше лимит; при необходимости можно докрутить пагинацию
        const { data } = await api.get('/users/me/favorites', {
            params: { page: 1, limit: 1000 },
        });
        const rows = Array.isArray(data)
            ? data
            : data.items ?? data.results ?? data.data ?? [];
        const ids = (rows || []).map((r) => r.id);
        dispatch(setFavIds(ids));
    } catch (_) {
        /* no-op */
    }
};
