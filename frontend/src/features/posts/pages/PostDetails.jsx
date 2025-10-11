// frontend/src/features/posts/pages/PostDetails.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchPost,
    toggleLike,
    toggleFavorite,
    toggleDislike,
} from '../postsActions';
import { matchPath, parsePath, navigate } from '../../../shared/router/helpers';
import { formatDate } from '../../../shared/utils/format';
import { assetUrl } from '../../../shared/utils/assetUrl';
import api from '../../../shared/api/axios';

function Blocks({ blocks }) {
    return (
        <div className="post-content">
            {blocks.map((b, i) => {
                const t = String(b?.type || '').toLowerCase();
                if (t === 'p') return <p key={i}>{b.text || b.value || ''}</p>;
                if (t === 'h2') return <h2 key={i}>{b.text || ''}</h2>;
                if (t === 'h3') return <h3 key={i}>{b.text || ''}</h3>;
                if (t === 'ul')
                    return (
                        <ul key={i}>
                            {(b.items || []).map((li, k) => (
                                <li key={k}>{li}</li>
                            ))}
                        </ul>
                    );
                if (t === 'img') {
                    const src =
                        assetUrl(b.url || b.src || b.path) ||
                        b.url ||
                        b.src ||
                        b.path;
                    if (!src) return null;
                    return (
                        <figure key={i} className="post-img">
                            <img src={src} alt={b.alt || ''} />
                            {b.caption && <figcaption>{b.caption}</figcaption>}
                        </figure>
                    );
                }
                return null;
            })}
        </div>
    );
}

function asArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.rows)) return payload.rows;
    // mysql2 на некоторых врапперах: [rows, fields]
    if (Array.isArray(payload?.[0]) && !payload?.[0]?.length === false)
        return payload[0];
    return [];
}

function Content({ content }) {
    if (Array.isArray(content)) return <Blocks blocks={content} />;
    if (
        content &&
        typeof content === 'object' &&
        Array.isArray(content.blocks)
    ) {
        return <Blocks blocks={content.blocks} />;
    }
    if (typeof content === 'string') {
        const s = content.trim();
        if (s.startsWith('[') || s.startsWith('{')) {
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return <Blocks blocks={parsed} />;
                if (parsed && Array.isArray(parsed.blocks))
                    return <Blocks blocks={parsed.blocks} />;
            } catch (_) {}
        }
        return (
            <div
                className="post-content html"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }
    return null;
}

export default function PostDetails() {
    const dispatch = useDispatch();
    const { current: post, loading, error } = useSelector((s) => s.posts);
    const auth = useSelector((s) => s.auth);
    const [comments, setComments] = useState([]);
    const [cLoading, setCLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);

    function handleBack() {
        history.back();
    }

    useEffect(() => {
        const path = parsePath();
        const params = matchPath('/posts/:id', path);
        if (params?.id) dispatch(fetchPost(params.id));
        const sc = document.querySelector('[data-scroller]');
        if (sc && typeof sc.scrollTo === 'function')
            sc.scrollTo({ top: 0, left: 0 });
        else window.scrollTo(0, 0);
    }, [dispatch]);

    useEffect(() => {
        if (!post?.id) return;
        (async () => {
            setCLoading(true);
            try {
                const { data } = await api.get(`/posts/${post.id}/comments`);
                setComments(asArray(data));
            } finally {
                setCLoading(false);
            }
        })();
    }, [post?.id]);

    const toggleCommentReaction = async (
        commentId,
        nextType /* 'like'|'dislike' */
    ) => {
        if (!auth?.token) {
            alert('To react to comments, please sign in.');
            return;
        }
        setComments((prev) => {
            const copy = prev.map((c) => ({ ...c }));
            const idx = copy.findIndex((c) => c.id === commentId);
            if (idx === -1) return prev;
            const c = copy[idx];
            const current =
                c.my_reaction ||
                (c.liked ? 'like' : c.disliked ? 'dislike' : null);
            let up = Number(c.likes_up_count || 0);
            let down = Number(c.likes_down_count || 0);

            const prevSnapshot = { ...c };

            if (current === nextType) {
                // снимаем реакцию
                if (nextType === 'like') up = Math.max(0, up - 1);
                else down = Math.max(0, down - 1);
                copy[idx] = {
                    ...c,
                    my_reaction: null,
                    liked: false,
                    disliked: false,
                    likes_up_count: up,
                    likes_down_count: down,
                };
                // оптимистично, а затем сервер
                api.delete(`/comments/${commentId}/like`).catch(() => {
                    // откат при ошибке
                    setComments((p2) =>
                        p2.map((x) => (x.id === commentId ? prevSnapshot : x))
                    );
                });
                return copy;
            }

            // переключаем/ставим
            if (nextType === 'like') {
                if (current === 'dislike') down = Math.max(0, down - 1);
                up += 1;
                copy[idx] = {
                    ...c,
                    my_reaction: 'like',
                    liked: true,
                    disliked: false,
                    likes_up_count: up,
                    likes_down_count: down,
                };
            } else {
                if (current === 'like') up = Math.max(0, up - 1);
                down += 1;
                copy[idx] = {
                    ...c,
                    my_reaction: 'dislike',
                    liked: false,
                    disliked: true,
                    likes_up_count: up,
                    likes_down_count: down,
                };
            }
            api.post(`/comments/${commentId}/like`, { type: nextType }).catch(
                () => {
                    // откат при ошибке
                    setComments((p2) =>
                        p2.map((x) => (x.id === commentId ? prevSnapshot : x))
                    );
                }
            );
            return copy;
        });
    };

    const submitComment = async () => {
        const text = newComment.trim();
        if (!text || !post?.id || sending) return;
        setSending(true);
        try {
            const { data } = await api.post(`/posts/${post.id}/comments`, {
                content: text,
            });
            const enriched = {
                id: data?.id,
                post_id: post.id,
                content: data?.content ?? text,
                created_at: data?.created_at ?? new Date().toISOString(),
                author_login:
                    data?.author_login ??
                    auth?.user?.login ??
                    auth?.user?.email ??
                    'me',
                author_name: data?.author_name ?? auth?.user?.full_name ?? '',
                author_avatar:
                    data?.author_avatar ?? auth?.user?.profile_picture ?? '',
                status: data?.status ?? 'active',
                my_reaction: null,
                liked: false,
                disliked: false,
                likes_up_count: 0,
                likes_down_count: 0,
            };
            // добавим в конец списка (или в начало — как тебе удобнее)
            setComments((prev) => [...prev, enriched]);
        } catch (e) {
            // можно показать тост/ошибку
            console.error(e);
        } finally {
            // очищаем поле в любом случае — чтобы не казалось, что "не стирается плейсхолдер"
            setNewComment('');
            setSending(false);
        }
    };

    if (loading && !post) return <div className="container">Loading…</div>;
    if (error) return <div className="container auth-error">{error}</div>;
    if (!post) return null;

    const created = formatDate(
        post.created_at ||
            post.publish_date ||
            post.createdAt ||
            post.updated_at
    );
    const authorLogin =
        post.author?.login || post.author_login || post.author_name || '';
    const authorAvatar =
        assetUrl(post.author?.avatar || post.author_avatar) ||
        post.author?.avatar ||
        post.author_avatar;
    const categoryName =
        post.category?.name ||
        post.category_name ||
        (Array.isArray(post.categories) && post.categories[0]?.name) ||
        (Array.isArray(post.categories) && post.categories.join(', ')) ||
        post.categories_csv ||
        '';

    const likesCount = post.likes_count ?? post.likes ?? 0;
    const likesUp = post.likes_up_count ?? 0;
    const likesDown = post.likes_down_count ?? 0;
    const favCount = post.favorites_count ?? post.favorites ?? 0;
    const isActivePost = String(post.status || '').toLowerCase() === 'active';

    return (
        <div className="container">
            <button className="auth-backline" onClick={handleBack}>
                <span className="arrow" /> Back
            </button>

            {/* Автор + дата/категория */}
            <div
                className="post-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '8px 0',
                }}
            >
                <img
                    src={authorAvatar || '/placeholder-avatar.png'}
                    onError={(e) => {
                        e.currentTarget.src = '/placeholder-avatar.png';
                    }}
                    alt=""
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--line)',
                    }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        <h2 className="inria-serif-bold" style={{ margin: 0 }}>
                            {post.title}
                        </h2>

                        {post.status && (
                            <span
                                title={`Status: ${
                                    isActivePost ? 'active' : 'inactive'
                                }`}
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 12,
                                    lineHeight: '18px',
                                    border: '1px solid var(--line)',
                                    background: isActivePost
                                        ? '#e8fff3'
                                        : '#fff5f5',
                                    color: isActivePost ? '#0a7f43' : '#9a1c1c',
                                }}
                            >
                                {isActivePost ? 'Active' : 'Inactive'}
                            </span>
                        )}
                    </div>

                    <div className="post-meta">
                        <span>{created}</span>
                        {categoryName && <span> · {categoryName}</span>}
                        {authorLogin && <span> · by {authorLogin}</span>}
                    </div>
                </div>
            </div>

            {/* Контент */}
            {/* Контент */}
            <Content
                content={post.content || post.content_html || post.contentHtml}
            />

            {/* Действия */}
            <div className="post-actions">
                <button
                    className={`mini-btn ${post.liked ? 'is-on' : ''}`}
                    onClick={() => dispatch(toggleLike(post.id))}
                    aria-pressed={!!post.liked}
                >
                    ♥ {likesUp}
                </button>
                <button
                    className={`mini-btn ${post.disliked ? 'is-on' : ''}`}
                    onClick={() => dispatch(toggleDislike(post.id))}
                    aria-pressed={!!post.disliked}
                    title="Dislike"
                >
                    👎 {likesDown}
                </button>
                <button
                    className={`mini-btn ${post.favorited ? 'is-on' : ''}`}
                    onClick={() => dispatch(toggleFavorite(post.id))}
                    aria-pressed={!!post.favorited}
                >
                    ☆ {favCount}
                </button>
                <button
                    className="mini-btn"
                    onClick={() => navigate(`/posts/${post.id}/edit`)}
                >
                    ✎ Edit
                </button>
            </div>

            {/* Комментарии */}
            <div style={{ marginTop: 18 }}>
                <h3 className="inria-serif-bold" style={{ margin: '0 0 8px' }}>
                    Comments
                </h3>
                {cLoading && (
                    <div className="auth-muted">Loading comments…</div>
                )}
                {!cLoading && comments.length === 0 && (
                    <div className="auth-muted">No comments yet</div>
                )}
                {!cLoading && comments.length > 0 && (
                    <div
                        className="comments-list"
                        style={{ display: 'grid', gap: 10 }}
                    >
                        {comments.map((c) => {
                            const cAva =
                                assetUrl(c.author_avatar) ||
                                c.author_avatar ||
                                '/placeholder-avatar.png';
                            const cName =
                                c.author_login || c.author_name || 'user';
                            const cDate = formatDate(
                                c.created_at || c.createdAt
                            );
                            return (
                                <div
                                    key={c.id}
                                    className="comment-row"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '40px 1fr',
                                        gap: 10,
                                    }}
                                >
                                    <img
                                        src={cAva}
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                '/placeholder-avatar.png';
                                        }}
                                        alt=""
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '1px solid var(--line)',
                                        }}
                                    />
                                    <div>
                                        <div
                                            className="auth-muted"
                                            style={{
                                                fontSize: 13,
                                                marginBottom: 4,
                                            }}
                                        >
                                            <b>{cName}</b> · {cDate}
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {c.content || c.text || ''}
                                        </div>
                                        <div
                                            className="comment-actions"
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                marginTop: 6,
                                            }}
                                        >
                                            <button
                                                className={`mini-btn ${
                                                    c.my_reaction === 'like' ||
                                                    c.liked
                                                        ? 'is-on'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    toggleCommentReaction(
                                                        c.id,
                                                        'like'
                                                    )
                                                }
                                                aria-pressed={
                                                    c.my_reaction === 'like' ||
                                                    c.liked
                                                }
                                                title="Like"
                                            >
                                                ♥{' '}
                                                {Number(c.likes_up_count || 0)}
                                            </button>
                                            <button
                                                className={`mini-btn ${
                                                    c.my_reaction ===
                                                        'dislike' || c.disliked
                                                        ? 'is-on'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    toggleCommentReaction(
                                                        c.id,
                                                        'dislike'
                                                    )
                                                }
                                                aria-pressed={
                                                    c.my_reaction ===
                                                        'dislike' || c.disliked
                                                }
                                                title="Dislike"
                                            >
                                                👎{' '}
                                                {Number(
                                                    c.likes_down_count || 0
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {/* Форма добавления комментария */}
                <div style={{ marginTop: 14 }}>
                    {auth?.token ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <textarea
                                placeholder="Write a comment…"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (
                                        (e.ctrlKey || e.metaKey) &&
                                        e.key === 'Enter'
                                    )
                                        submitComment();
                                }}
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <button
                                    className="mini-btn"
                                    onClick={submitComment}
                                    disabled={sending || !newComment.trim()}
                                >
                                    {sending ? 'Sending…' : 'Post comment'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="auth-muted">
                            To comment, please sign in.
                        </div>
                    )}
                </div>
            </div>

            <div id="comments-anchor" />
        </div>
    );
}
