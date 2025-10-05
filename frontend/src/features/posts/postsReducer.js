// frontend/src/features/posts/postsReducer.js
import {
    POSTS_LOADING,
    POSTS_ERROR,
    POSTS_SET,
    POSTS_APPEND,
    POSTS_SET_META,
    POST_SET_ONE,
} from './postsActions';

const initial = {
    loading: false,
    error: null,
    items: [],
    current: null, // для деталей
    meta: {
        page: 1,
        limit: 10,
        total: 0,
        sort: 'likes_desc',
        category_id: null,
        q: '',
    },
};

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
            const updated = action.payload;
            // обновим current и, если он из списка, — элемент в списке
            const items = state.items.map((p) =>
                p.id === updated.id ? updated : p
            );
            const inList = items.some((p) => p.id === updated.id);
            return {
                ...state,
                current: updated,
                items: inList ? items : state.items,
            };
        }
        default:
            return state;
    }
}
