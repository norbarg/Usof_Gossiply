import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { navigate } from '../../../shared/router/helpers';
import { logout, setUser } from '../../auth/authActions';
import api from '../../../shared/api/axios';
import { assetUrl } from '../../../shared/utils/assetUrl';
import PostCard from '../../posts/components/PostCard';
import MetaBalls from '../../../shared/components/MetaBalls';
import starUrl from '/icons/star.png';
import plusIconUrl from '/icons/plus-circle-on.png';
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

export default function Profile() {
    const dispatch = useDispatch();
    const { user, token } = useSelector((s) => s.auth);
    const favIds = useSelector((s) => s.posts?.favoriteIds || []);

    const [stats, setStats] = useState({
        posts: null,
        favorites: null,
        rating: null,
    });
    const [myPosts, setMyPosts] = useState([]);
    const [myLoading, setMyLoading] = useState(false);
    const [myError, setMyError] = useState('');
    const [myMeta, setMyMeta] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        if (!token) navigate('/login');
    }, [token]);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const { data } = await api.get(`/users/${user.id}`);
                if (data) dispatch(setUser(data));
            } catch {}
        })();
    }, [user?.id, dispatch]);

    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const { data } = await api
                    .get('/users/me/stats')
                    .catch(async () => {
                        if (!user?.id) throw new Error('no user');
                        return await api.get(`/users/${user.id}/stats`);
                    });
                if (!stop && data) {
                    setStats({
                        posts: Number(
                            data.posts ??
                                data.posts_count ??
                                data.total_posts ??
                                0
                        ),
                        favorites: Number(
                            data.favorites ??
                                data.favorites_count ??
                                favIds.length
                        ),
                        rating: Number(
                            data.rating ??
                                data.reputation ??
                                data.score ??
                                user?.rating ??
                                NaN
                        ),
                    });
                }
            } catch {
                setStats((s) => ({ ...s, favorites: favIds.length }));
            }
        })();
        return () => {
            stop = true;
        };
    }, [user?.id, favIds.length]);

    const ratingDisplay = useMemo(() => {
        const s = Number.isFinite(stats.rating) ? stats.rating : null;
        const u = Number.isFinite(user?.rating) ? user.rating : null;
        return s ?? u ?? '—';
    }, [stats.rating, user?.rating]);

    async function fetchMyPosts({ page = 1, append = false } = {}) {
        if (!user?.id) return;
        const limit = myMeta.limit || 20;
        setMyLoading(true);
        setMyError('');
        try {
            let resp;
            try {
                resp = await api.get('/users/me/posts', {
                    params: {
                        page,
                        limit,
                        sortBy: 'date_desc',
                        sort: 'date_desc',
                        order_by: 'created_at',
                        order: 'desc',
                        include_inactive: 1,
                        any_status: 1,
                        per_page: limit,
                        offset: (page - 1) * limit,
                    },
                });
            } catch {
                resp = await api.get('/posts', {
                    params: {
                        page,
                        limit,
                        per_page: limit,
                        offset: (page - 1) * limit,
                        skip: (page - 1) * limit,
                        take: limit,
                        author_id: user.id,
                        user_id: user.id,
                        my: 1,
                        sortBy: 'date_desc',
                        sort: 'date_desc',
                        order_by: 'created_at',
                        order: 'desc',
                        include_inactive: 1,
                        any_status: 1,
                    },
                });
            }
            const { data, headers } = resp;
            let items, total;
            if (Array.isArray(data)) {
                items = data;
                total =
                    Number(headers?.['x-total-count']) ||
                    (append ? myMeta.total : items.length);
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
            items = (items || []).slice().sort((a, b) => {
                const ta = new Date(a.created_at || a.createdAt || 0).getTime();
                const tb = new Date(b.created_at || b.createdAt || 0).getTime();
                return tb - ta;
            });
            setMyPosts((prev) => {
                const next = append ? [...prev, ...items] : items;
                const map = new Map();
                for (const p of next) if (p?.id != null) map.set(p.id, p);
                return Array.from(map.values());
            });
            setMyMeta({ page, limit, total });
        } catch (e) {
            setMyError(e?.response?.data?.error || 'Failed to load your posts');
        } finally {
            setMyLoading(false);
        }
    }

    useEffect(() => {
        setMyPosts([]);
        setMyMeta((m) => ({ ...m, page: 1, total: 0 }));
        if (user?.id) fetchMyPosts({ page: 1, append: false });
    }, [user?.id]);

    const hasMore = myPosts.length < (myMeta.total || 0);
    const loadMore = () =>
        fetchMyPosts({ page: (myMeta.page || 1) + 1, append: true });

    if (!user) {
        return (
            <div className="container">
                <div className="auth-muted" style={{ marginTop: 12 }}>
                    Loading profile…
                </div>
            </div>
        );
    }

    const name = user.full_name || user.login;
    const joined = fmtDate(user.created_at);
    const role = user.role || 'user';
    const postsCountDisplay =
        Number.isFinite(stats.posts) && stats.posts !== null
            ? stats.posts
            : myMeta.total || myPosts.length || '—';

    const nameRows = Array.from({ length: 7 }, () => name);

    return (
        <div className="container">
            <section className="profile-wrap glam">
                <div className="profile-glow" aria-hidden />

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
                        {user.email && (
                            <div className="profile-meta__row">
                                <span>Email</span>
                                <b>
                                    <a href={`mailto:${user.email}`}>
                                        {user.email}
                                    </a>
                                </b>
                            </div>
                        )}
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

                    <div className="profile-actions row">
                        <button
                            className="btn violet inria-serif-bold"
                            onClick={() => navigate('/profile/edit')}
                        >
                            Edit profile
                        </button>
                        <button
                            className="btn violet inria-serif-bold"
                            onClick={async () => {
                                await dispatch(logout());
                                try {
                                    sessionStorage.removeItem('justLoggedIn');
                                } catch {}
                                try {
                                    window.history.replaceState({}, '', '/');
                                } catch {}
                                navigate('/login');
                            }}
                        >
                            Log out
                        </button>
                    </div>

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

                <div className="profile-vline" aria-hidden />

                <main className=" glam-main">
                    <div className="main-topbar">
                        <div className="counters-inline">
                            <span>
                                Posts: <b>{postsCountDisplay}</b>
                            </span>
                            <span>
                                Favorite:{' '}
                                <b>{stats.favorites ?? favIds.length}</b>
                            </span>
                        </div>
                        <button
                            className="create-btn"
                            onClick={() => navigate('/posts/new')}
                            aria-label="Create post"
                            title="Create post"
                        >
                            <img
                                src={plusIconUrl}
                                alt=""
                                className="create-icon"
                            />
                        </button>
                    </div>

                    <h3 className="profile-section-title">My Posts</h3>

                    {myError && (
                        <div className="auth-error" style={{ margin: '8px 0' }}>
                            {myError}
                        </div>
                    )}
                    {myLoading && myPosts.length === 0 && (
                        <div className="auth-muted">Loading…</div>
                    )}

                    <div className="post-grid">
                        {myPosts.map((p) => (
                            <PostCard
                                key={p.id}
                                post={p}
                                onToggleFavorite={() => {}}
                            />
                        ))}
                    </div>

                    <div style={{ margin: '12px 0', textAlign: 'center' }}>
                        {myLoading && myPosts.length > 0 && (
                            <div className="auth-muted">Loading…</div>
                        )}
                        {!myLoading && hasMore && (
                            <button className="btn ghost" onClick={loadMore}>
                                Load more
                            </button>
                        )}
                        {!myLoading && !hasMore && myPosts.length > 0 && (
                            <div className="auth-muted">That’s all</div>
                        )}
                        {!myLoading && myPosts.length === 0 && !myError && (
                            <div className="auth-muted">No posts yet.</div>
                        )}
                    </div>
                </main>
            </section>
        </div>
    );
}
