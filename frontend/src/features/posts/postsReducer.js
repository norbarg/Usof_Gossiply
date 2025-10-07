// frontend/src/features/posts/postsReducer.js
import {
    POSTS_LOADING,
    POSTS_ERROR,
    POSTS_SET,
    POSTS_APPEND,
    POSTS_SET_META,
    POST_SET_ONE,
    POSTS_SET_FAV_IDS,
} from './postsActions';

const initial = {
    loading: false,
    error: null,
    items: [],
    current: null, // для деталей
    favoriteIds: [],
    meta: {
        page: 1,
        limit: 10,
        total: 0,
        sort: 'likes_desc',
        category_id: null,
        q: '',
    },
};

// утилита нормализации «звезды»
function withFavorited(items, favIds) {
    const set = new Set(favIds || []);
    return (items || []).map((p) => {
        // если сервер уже отдал boolean — оставим его, иначе выставим из набора
        const hasServer = typeof p.favorited === 'boolean';
        return hasServer ? p : { ...p, favorited: set.has(p.id) };
    });
}

export function postsReducer(state = initial, action) {
    switch (action.type) {
        case POSTS_LOADING:
            return { ...state, loading: action.payload, error: null };
        case POSTS_ERROR:
            return { ...state, error: action.payload };
        case POSTS_SET:
            return { ...state, items: action.payload };

        case POSTS_APPEND: {
            const incoming = Array.isArray(action.payload)
                ? action.payload
                : [];
            if (incoming.length === 0) return state;

            // дедуп по id, сохраняем порядок: сначала старые, сверху новые
            const map = new Map();
            for (const it of state.items) map.set(it.id, it);
            for (const it of incoming) map.set(it.id, it);

            return { ...state, items: Array.from(map.values()) };
        }
        case POSTS_SET_META:
            return { ...state, meta: { ...state.meta, ...action.payload } };
        case POST_SET_ONE: {
            const upd = action.payload; // { id, ...patch }
            const nextItems = state.items.map((it) =>
                it.id === upd.id ? { ...it, ...upd } : it
            );
            const nextCurrent =
                state.current && state.current.id === upd.id
                    ? { ...state.current, ...upd }
                    : state.current;

            return { ...state, items: nextItems, current: nextCurrent };
        }
        case POSTS_SET_FAV_IDS: {
            const favoriteIds = Array.isArray(action.payload)
                ? action.payload
                : [];
            // при обновлении ids — пересчитаем «звёзды» в текущем списке
            const items = withFavorited(state.items, favoriteIds);
            return { ...state, favoriteIds, items };
        }
        default:
            return state;
    }
}
