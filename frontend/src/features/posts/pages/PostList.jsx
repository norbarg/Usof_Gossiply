// frontend/src/features/posts/pages/PostList.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    listPosts,
    toggleLike,
    toggleFavorite,
    loadMyFavoriteIds,
} from '../postsActions';
import PostCard from '../components/PostCard';
import FiltersBar from '../../../shared/components/FiltersBar';
import Paginator from '../../../shared/components/Paginator';
import api from '../../../shared/api/axios';
import { onRouteChange } from '../../../shared/router/helpers';
import '../../../shared/styles/feed.css';
import plusOff from '../../../../public/icons/plus-circle-off.png';
import plusOn from '../../../../public/icons/plus-circle-on.png';
import favOff from '../../../../public/icons/fav_off.png';
import favOn from '../../../../public/icons/fav_on.png';

const getQFromUrl = () => new URLSearchParams(location.search).get('q') || '';

const getCatsFromUrl = () => {
    const usp = new URLSearchParams(location.search);
    const raw =
        usp.get('category_ids') ||
        usp.get('category_id') ||
        usp.get('cat') ||
        usp.get('category') ||
        '';
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};
export default function PostList() {
    const dispatch = useDispatch();
    const { items, meta, loading, error } = useSelector((s) => s.posts);
    const [filters, setFilters] = useState({
        category_ids: getCatsFromUrl(),
        q: getQFromUrl(),
        date_from: '',
        date_to: '',
        status: '',
    });

    // следим за изменением URL (когда поиск меняется из хедера)
    useEffect(() => {
        const off = onRouteChange(() => {
            const q = getQFromUrl();
            const category_ids = getCatsFromUrl();
            setFilters((f) => ({ ...f, q, category_ids })); // <-- обновляем из URL
        });
        return off;
    }, []);

    useEffect(() => {
        dispatch(loadMyFavoriteIds());
    }, [dispatch]);

    useEffect(() => {
        dispatch(listPosts({ page: 1, limit: 10, ...filters, append: false }));
    }, [dispatch, filters]);

    const [cats, setCats] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/categories'); // или твой реальный путь
                // ожидаем [{id, name}]
                setCats(data.items ?? data.results ?? data.data ?? data);
            } catch {}
        })();
    }, []);

    // === Infinite scroll ===
    const sentinelRef = useRef(null);
    const limit = meta.limit || 10;
    const total = meta.total || 0;
    const hasMore = items.length < total;

    useEffect(() => {
        if (!sentinelRef.current) return;

        const io = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry.isIntersecting) return;
                if (loading) return;
                if (!hasMore) return;

                const nextPage = (meta.page || 1) + 1;
                dispatch(
                    listPosts({
                        page: nextPage,
                        limit: limit,
                        ...filters,
                        append: true, // важное: просим аппендить
                    })
                );
            },
            { rootMargin: '200px 0px 200px 0px' }
        );

        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [dispatch, filters, loading, hasMore, meta.page, limit]);

    return (
        <div className="container">
            <FiltersBar
                value={{
                    categoryIds: (filters.category_ids ?? []).map(String),
                    sortBy: filters.sortBy ?? 'likes_desc',
                    query: filters.q ?? '',
                    dateFrom: filters.date_from ?? '',
                    dateTo: filters.date_to ?? '',
                    status: filters.status ?? '',
                }}
                onChange={(v) =>
                    setFilters({
                        category_ids: Array.isArray(v.categoryIds)
                            ? v.categoryIds
                            : [],
                        sortBy: v.sortBy || 'likes_desc',
                        q: v.query ?? '',
                        date_from: v.dateFrom || '',
                        date_to: v.dateTo || '',
                        status: v.status || '',
                    })
                }
                categories={cats}
                catIconOff={plusOff} // <- ваша иконка для НЕактивного
                catIconOn={plusOn}
            />

            {loading && (
                <div className="auth-muted" style={{ marginTop: 12 }}>
                    Loading…
                </div>
            )}
            {error && <div className="auth-error">{error}</div>}

            <div className="post-grid">
                {items.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onToggleLike={(id) => dispatch(toggleLike(id))}
                        onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
                        favIconOff={favOff}
                        favIconOn={favOn}
                    />
                ))}
            </div>

            {/* нижний «якорь» для IntersectionObserver */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {/* индикатор загрузки и конец списка */}
            <div
                style={{
                    margin: '12px 0',
                    color: '#9aa3b2',
                    textAlign: 'center',
                }}
            >
                {loading
                    ? 'Loading…'
                    : !hasMore && items.length > 0
                    ? 'That’s all '
                    : ''}
            </div>
        </div>
    );
}
