// frontend/src/features/profile/pages/PublicProfile.jsx
import React, { useEffect, useState } from 'react';
import { matchPath, parsePath } from '../../../shared/router/helpers';
import api from '../../../shared/api/axios';
import { assetUrl } from '../../../shared/utils/assetUrl';
import PostCard from '../../posts/components/PostCard';
import MetaBalls from '../../../shared/components/MetaBalls';
import starUrl from '/icons/star.png';
import '../../../shared/styles/fonts.css';
import '../../../shared/styles/profile.css';

function fmtDate(value) {
    if (!value) return '';
    try {
        const dt = new Date(value);
        return dt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

export default function PublicProfile() {
    const path = parsePath();
    const m = matchPath('/profile/:id', path);
    const userId = Number(m?.id || 0);

    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        posts: null,
        favorites: null,
        rating: null,
    });
    const [posts, setPosts] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    // загрузка юзера
    useEffect(() => {
        let stop = false;
        (async () => {
            setLoading(true);
            setErr('');
            try {
                const { data } = await api.get(`/users/${userId}`);
                if (!stop) setUser(data || null);
            } catch (e) {
                if (!stop) setErr(e?.response?.data?.error || 'User not found');
            } finally {
                if (!stop) setLoading(false);
            }
        })();
        return () => {
            stop = true;
        };
    }, [userId]);

    // статистика
    useEffect(() => {
        if (!userId) return;
        let stop = false;
        (async () => {
            try {
                const { data } = await api.get(`/users/${userId}/stats`);
                if (!stop && data) {
                    setStats({
                        posts: Number(data.posts ?? data.total_posts ?? 0),
                        favorites: Number(
                            data.favorites ?? data.favorites_count ?? 0
                        ),
                        rating: Number(
                            data.rating ?? data.reputation ?? data.score ?? NaN
                        ),
                    });
                }
            } catch {}
        })();
        return () => {
            stop = true;
        };
    }, [userId]);

    // посты автора
    // посты автора
    async function fetchPosts({ page = 1, append = false } = {}) {
        if (!userId) return;
        const limit = meta.limit || 20;

        try {
            const params = {
                page,
                limit,
                // разные алиасы, которые могли быть у бэка
                author_id: userId,
                authorId: userId,
                author: userId,
                user_id: userId,
                userId: userId,
                by: userId,
                owner_id: userId,
                ownerId: userId,
                only_author: 1,
                // типичные пагинационные алиасы на всякий:
                per_page: limit,
                offset: (page - 1) * limit,
                skip: (page - 1) * limit,
                take: limit,
                // желательно видеть только активные в публичном профиле:
                status: 'active',
            };

            const resp = await api.get('/posts', { params });
            const { data, headers } = resp;

            let items, totalFromServer;

            if (Array.isArray(data)) {
                items = data;
                totalFromServer = Number(headers?.['x-total-count']);
            } else if (data?.items) {
                items = data.items;
                totalFromServer = Number(
                    data.total ?? data.count ?? data.meta?.total
                );
            } else if (data?.results) {
                items = data.results;
                totalFromServer = Number(data.count ?? data.total);
            } else if (data?.data && data?.meta) {
                items = data.data;
                totalFromServer = Number(data.meta.total ?? data.meta.count);
            } else {
                items = data?.rows || data?.list || [];
                totalFromServer = Number(data?.total ?? data?.count);
            }

            // 🔒 ЖЁСТКО фильтруем клиентом по author_id (и возможным полям)
            const filtered = (items || []).filter((p) => {
                const aid = Number(
                    p.author_id ??
                        p.user_id ??
                        p.authorId ??
                        p.userId ??
                        p.author?.id ??
                        p.user?.id
                );
                return Number.isFinite(aid) && aid === userId;
            });

            // сортировка по дате (на всякий)
            filtered.sort((a, b) => {
                const ta = new Date(a.created_at || a.createdAt || 0).getTime();
                const tb = new Date(b.created_at || b.createdAt || 0).getTime();
                return tb - ta;
            });

            setPosts((prev) => {
                const next = append ? [...prev, ...filtered] : filtered;
                // уникализируем по id
                const map = new Map();
                for (const p of next) if (p?.id != null) map.set(p.id, p);
                return Array.from(map.values());
            });

            // Если сервер дал «общий» total, он может быть некорректен для автора.
            // Пытаемся взять более точный, если есть; иначе — считаем по факту.
            const totalAuthor = Number(
                data?.author_total ?? data?.author_posts_total ?? NaN
            );
            const nextTotal = Number.isFinite(totalAuthor)
                ? totalAuthor
                : append
                ? meta.total
                : filtered.length;

            setMeta({ page, limit, total: nextTotal });
        } catch (e) {
            setErr(e?.response?.data?.error || 'Failed to load posts');
        }
    }

    useEffect(() => {
        setPosts([]);
        setMeta((m) => ({ ...m, page: 1, total: 0 }));
        if (userId) fetchPosts({ page: 1, append: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const hasMore = posts.length < (meta.total || 0);
    const loadMore = () =>
        fetchPosts({ page: (meta.page || 1) + 1, append: true });

    if (!userId)
        return (
            <div className="container">
                <div className="auth-error" style={{ marginTop: 12 }}>
                    Invalid user
                </div>
            </div>
        );
    if (loading && !user)
        return (
            <div className="container">
                <div className="auth-muted" style={{ marginTop: 12 }}>
                    Loading profile…
                </div>
            </div>
        );
    if (err && !user)
        return (
            <div className="container">
                <div className="auth-error" style={{ marginTop: 12 }}>
                    {err}
                </div>
            </div>
        );
    if (!user) return null;

    const name = user.full_name || user.login;
    const joined = fmtDate(user.created_at);
    const role = user.role || 'user';
    const ratingDisplay = (() => {
        const s = Number.isFinite(stats.rating) ? stats.rating : null;
        const u = Number.isFinite(user?.rating) ? user?.rating : null;
        return s ?? u ?? '—';
    })();

    const postsCountDisplay =
        Number.isFinite(stats.posts) && stats.posts !== null
            ? stats.posts
            : meta.total || posts.length || '—';

    const nameRows = Array.from({ length: 7 }, () => name);

    return (
        <div className="container">
            <section className="profile-wrap glam">
                <div className="profile-glow" aria-hidden />

                {/* ЛЕВАЯ КОЛОНКА */}
                <aside>
                    <div className="left-head">
                        <div className="profile-avatar-wrap big">
                            <img
                                className="profile-avatar"
                                src={
                                    assetUrl(user.profile_picture) ||
                                    '/placeholder-avatar.png'
                                }
                                alt={name}
                                onError={(e) => {
                                    e.currentTarget.src =
                                        '/placeholder-avatar.png';
                                }}
                            />
                        </div>

                        <div className="name-stack">
                            <div className="name-bg-multi" aria-hidden>
                                {nameRows.map((t, i) => (
                                    <div
                                        key={i}
                                        className={`name-row ${
                                            i === nameRows.length - 2
                                                ? 'is-solid'
                                                : ''
                                        }`}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="profile-meta">
                        <div className="profile-meta__row profile-meta__row--top">
                            <div className="profile-login">@{user.login}</div>
                            <div className="profile-role-chip">{role}</div>
                        </div>

                        {/* email лучше не показывать публично; если нужно — верни этот блок */}
                        {joined && (
                            <div className="profile-meta__row">
                                <span>joined</span>
                                <b>{joined}</b>
                            </div>
                        )}
                        <div className="profile-meta__row">
                            <span>rating</span>
                            <b className="rating-line">
                                <img
                                    src={starUrl}
                                    alt=""
                                    className="icon-star icon-img"
                                />
                                {String(ratingDisplay)}
                            </b>
                        </div>
                    </div>

                    {/* БЕЗ кнопок Edit/Logout — как просили */}

                    <div className="profile-blob-card">
                        <MetaBalls
                            className="blob"
                            color="#a583ff"
                            cursorBallColor="#ffffff"
                            speed={0.35}
                            ballCount={12}
                            animationSize={34}
                            enableTransparency
                            clumpFactor={1}
                            cursorBallSize={3}
                        />
                    </div>
                </aside>

                {/* ВЕРТИКАЛЬНАЯ ЛИНИЯ */}
                <div className="profile-vline" aria-hidden />

                {/* ПРАВАЯ КОЛОНКА */}
                <main className="glam-main">
                    <div className="main-topbar">
                        <div className="counters-inline">
                            <span>
                                Posts: <b>{postsCountDisplay}</b>
                            </span>
                            <span>
                                Favorite: <b>{Number(stats.favorites ?? 0)}</b>
                            </span>
                        </div>
                        {/* БЕЗ кнопки Create post */}
                    </div>

                    <h3 className="profile-section-title">Posts</h3>

                    {err && (
                        <div className="auth-error" style={{ margin: '8px 0' }}>
                            {err}
                        </div>
                    )}

                    <div className="post-grid">
                        {posts.map((p) => (
                            <PostCard
                                key={p.id}
                                post={p}
                                onToggleFavorite={() => {}}
                            />
                        ))}
                    </div>

                    <div style={{ margin: '12px 0', textAlign: 'center' }}>
                        {loading && posts.length === 0 && (
                            <div className="auth-muted">Loading…</div>
                        )}
                        {!loading && posts.length === 0 && !err && (
                            <div className="auth-muted">No posts yet.</div>
                        )}
                        {!loading &&
                            posts.length > 0 &&
                            (hasMore ? (
                                <button
                                    className="btn ghost"
                                    onClick={loadMore}
                                >
                                    Load more
                                </button>
                            ) : (
                                <div className="auth-muted">That’s all</div>
                            ))}
                    </div>
                </main>
            </section>
        </div>
    );
}
