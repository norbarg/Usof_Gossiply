// frontend/src/features/favorites/pages/FavoritesList.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../../shared/api/axios';
import PostCard from '../../posts/components/PostCard';
import { toggleFavorite, toggleLike } from '../../posts/postsActions';
import { navigate } from '../../../shared/router/helpers';
import favOff from '/icons/fav_off.png';
import favOn from '/icons/fav_on.png';
import '../../../shared/styles/feed.css';

export default function FavoritesList() {
    const dispatch = useDispatch();
    const { token } = useSelector((s) => s.auth);

    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!token) navigate('/login');
    }, [token]);

    async function fetchPage(p) {
        try {
            setLoading(true);
            setErr(null);
            const { data } = await api.get('/users/me/favorites', {
                params: { page: p, limit },
            });
            const rows = Array.isArray(data)
                ? data
                : data.items ?? data.results ?? data.data ?? [];
            const mapped = (rows || []).map((r) => ({
                ...r,
                favorited: true,
                created_at:
                    r.created_at ||
                    r.publish_date ||
                    r.date ||
                    r.updated_at ||
                    null,
                author_login:
                    r.author_login ||
                    r.author ||
                    r.user_login ||
                    r.username ||
                    r.login ||
                    '',
                author_name: r.author_name || r.full_name || r.name || '',
                categories: Array.isArray(r.categories)
                    ? r.categories
                    : r.categories_csv
                    ? String(r.categories_csv).split(',').filter(Boolean)
                    : [],
            }));

            setItems((prev) =>
                p === 1 ? mapped : dedupById(prev.concat(mapped))
            );
            setPage(p);
            setHasMore((rows || []).length === limit);
        } catch (e) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                navigate('/login');
                return;
            }
            setErr(e?.response?.data?.error || 'Failed to load favorites');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPage(1);
    }, []);

    const sentinelRef = useRef(null);
    useEffect(() => {
        if (!sentinelRef.current) return;
        const io = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry.isIntersecting) return;
                if (loading || !hasMore) return;
                fetchPage(page + 1);
            },
            { rootMargin: '200px 0px 200px 0px' }
        );
        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [page, hasMore, loading]);

    const onFav = (id) => {
        const prevItems = items;
        setItems((prev) => prev.filter((p) => p.id !== id));
        dispatch(toggleFavorite(id, { currentFavorited: true })).catch(() => {
            setItems(prevItems);
        });
    };

    const onLike = (id) => dispatch(toggleLike(id));

    return (
        <div className="container">
            <h2 className="inria-serif-bold fav-title">Favorite posts</h2>

            {err && <div className="auth-error">{err}</div>}

            <div className="post-grid">
                {items.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onToggleLike={onLike}
                        onToggleFavorite={onFav}
                        favIconOff={favOff}
                        favIconOn={favOn}
                    />
                ))}
            </div>

            <div ref={sentinelRef} style={{ height: 1 }} />

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
                    ? 'That’s all'
                    : ''}
            </div>
        </div>
    );
}

function dedupById(arr) {
    const m = new Map();
    for (const it of arr) m.set(it.id, it);
    return Array.from(m.values());
}
