// frontend/src/features/posts/pages/PostList.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { listPosts, toggleLike, toggleFavorite } from '../postsActions';
import PostCard from '../components/PostCard';
import FiltersBar from '../../../shared/components/FiltersBar';
import Paginator from '../../../shared/components/Paginator';
import api from '../../../shared/api/axios';
import { onRouteChange } from '../../../shared/router/helpers';
import '../../../shared/styles/feed.css';

const getQFromUrl = () => new URLSearchParams(location.search).get('q') || '';

export default function PostList() {
    const dispatch = useDispatch();
    const { items, meta, loading, error } = useSelector((s) => s.posts);
    const [filters, setFilters] = useState({
        category_ids: [], // массив строк/чисел
        q: getQFromUrl(),
        date_from: '',
        date_to: '',
        status: '',
    });

    // следим за изменением URL (когда поиск меняется из хедера)
    useEffect(() => {
        const off = onRouteChange(() => {
            const q = getQFromUrl();
            setFilters((f) => ({ ...f, q }));
        });
        return off;
    }, []);

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
            <h2 className="inria-serif-bold" style={{ marginBottom: 12 }}>
                Posts
            </h2>
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
                    ? 'That’s all 👋'
                    : ''}
            </div>
        </div>
    );
}
