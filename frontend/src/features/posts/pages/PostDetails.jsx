// frontend/src/features/posts/pages/PostDetails.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchPost,
    toggleLike,
    toggleFavorite,
    toggleDislike,
    updatePost,
    deletePost,
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

// строим дерево: родители сверху, у каждого .replies[]
function buildTree(rows) {
    const byId = new Map();
    rows.forEach((r) => byId.set(r.id, { ...r, replies: [] }));
    const roots = [];
    byId.forEach((c) => {
        if (c.parent_id) {
            const parent = byId.get(c.parent_id);
            if (parent) parent.replies.push(c);
            else roots.push(c); // fallback если пришёл некорректный parent
        } else {
            roots.push(c);
        }
    });
    // сортировка внутри веток по дате (на всякий)
    const sortRec = (list) => {
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        list.forEach((n) => sortRec(n.replies));
    };
    sortRec(roots);
    return roots;
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
    const [replyOpenFor, setReplyOpenFor] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [cLoading, setCLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [busyById, setBusyById] = useState({}); // { [commentId]: true }

    function goBackSmart() {
        if (window.history.length > 1) return history.back();
        const fallback = sessionStorage.getItem('back:fallback') || '/posts';
        navigate(fallback);
    }
    const handleBack = goBackSmart;

    useEffect(() => {
        const path = parsePath();
        const params = matchPath('/posts/:id', path);
        if (params?.id) {
            dispatch(fetchPost(params.id)).then((ok) => {
                if (ok === false) goBackSmart(); // если 404 — сразу назад (лента/профиль/фолбэк)
            });
        }
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

    const openReply = (cid) => {
        setReplyOpenFor(cid);
        setReplyText('');
    };

    const submitReply = async (parentId) => {
        const text = replyText.trim();
        if (!text || !post?.id || sending) return;
        setSending(true);
        try {
            const { data } = await api.post(`/posts/${post.id}/comments`, {
                content: text,
                parent_id: parentId,
            });
            // достаточно просто допушить в плоский список — дерево построится на лету
            setComments((prev) => [...prev, data]);
            setReplyText('');
            setReplyOpenFor(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    // ====== права для комментариев ======
    const meId = Number(auth?.user?.id ?? 0);
    const role = String(auth?.user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const canEditComment = (c) => meId > 0 && Number(c.author_id) === meId;
    const canToggleStatus = (c) => canEditComment(c) || isAdmin;
    const canDeleteComment = (c) => canEditComment(c) || isAdmin;

    // ====== утилиты обновления списка ======
    const patchCommentLocal = (id, patch) =>
        setComments((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        );
    const removeSubtreeLocal = (rootId) =>
        setComments((prev) => {
            // parent_id -> [childId]
            const map = new Map();
            prev.forEach((c) => {
                if (c.parent_id != null) {
                    if (!map.has(c.parent_id)) map.set(c.parent_id, []);
                    map.get(c.parent_id).push(c.id);
                }
            });
            const toDel = new Set([rootId]);
            const stack = [rootId];
            while (stack.length) {
                const id = stack.pop();
                const kids = map.get(id) || [];
                for (const k of kids)
                    if (!toDel.has(k)) {
                        toDel.add(k);
                        stack.push(k);
                    }
            }
            return prev.filter((c) => !toDel.has(c.id));
        });
    const setBusy = (id, v) => setBusyById((p) => ({ ...p, [id]: v }));

    // ====== EDIT ======
    const startEdit = (c) => {
        if (!canEditComment(c)) return;
        setEditingId(c.id);
        setEditText(c.content || c.text || '');
    };
    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };
    const saveEdit = async (id) => {
        const text = (editText || '').trim();
        if (!text) return;
        setBusy(id, true);
        try {
            const { data } = await api.patch(`/comments/${id}`, {
                content: text,
            });
            patchCommentLocal(id, { content: data?.content ?? text });
            setEditingId(null);
            setEditText('');
        } catch (e) {
            console.error(e);
            alert('Failed to save comment');
        } finally {
            setBusy(id, false);
        }
    };

    // ====== STATUS TOGGLE (active/inactive) ======
    const toggleCommentStatus = async (c) => {
        if (!canToggleStatus(c)) return;
        const id = c.id;
        const next =
            String(c.status || 'active') === 'active' ? 'inactive' : 'active';
        setBusy(id, true);
        const prev = { ...c };
        // оптимистично
        patchCommentLocal(id, { status: next });
        try {
            await api.patch(`/comments/${id}`, { status: next });
        } catch (e) {
            // откат
            patchCommentLocal(id, { status: prev.status });
            console.error(e);
            alert('Failed to change status');
        } finally {
            setBusy(id, false);
        }
    };

    // ====== DELETE ======
    const deleteCommentById = async (c) => {
        if (!canDeleteComment(c)) return;
        const id = c.id;
        if (!confirm('Delete this comment?')) return;
        setBusy(id, true);
        try {
            await api.delete(`/comments/${id}`);
            // удаляем один узел (дети при следующей загрузке придут как есть с бэка;
            // в текущем UI мы вычистим только сам узел)
            removeSubtreeLocal(id);
        } catch (e) {
            console.error(e);
            alert('Failed to delete comment');
        } finally {
            setBusy(id, false);
        }
    };

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
            // Берём ответ сервера как источник истины и добавляем только безопасные дефолты:
            const enriched = {
                ...data,
                post_id: data?.post_id ?? post.id,
                author_id: Number(data?.author_id ?? auth?.user?.id), // ← ВАЖНО
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
                likes_up_count: Number(data?.likes_up_count ?? 0),
                likes_down_count: Number(data?.likes_down_count ?? 0),
            };
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

    const authorId = Number(post?.author_id ?? post?.author?.id ?? 0);
    const isAuthor = meId > 0 && authorId > 0 && meId === authorId;
    const canEditContent = isAuthor; // контент редактирует только автор
    const canEditCategories = isAuthor || isAdmin; // категории — автор и админ
    const canChangeStatus = isAdmin; // актив/неактив — только админ
    const canDelete = isAuthor || isAdmin;

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
            <div
                className="post-actions"
                style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginTop: 8,
                }}
            >
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
                {(canEditContent || canEditCategories) && (
                    <button
                        className="mini-btn"
                        onClick={() => {
                            sessionStorage.setItem('cameFromPost', '1');
                            navigate(`/posts/${post.id}/edit`);
                        }}
                    >
                        ✎ Edit
                    </button>
                )}

                {canChangeStatus && (
                    <button
                        className="mini-btn"
                        onClick={async () => {
                            const next =
                                post.status === 'active'
                                    ? 'inactive'
                                    : 'active';
                            await dispatch(
                                updatePost({ id: post.id, status: next })
                            );
                        }}
                        title={
                            post.status === 'active' ? 'Deactivate' : 'Activate'
                        }
                    >
                        {post.status === 'active'
                            ? '⏸ Make inactive'
                            : '▶ Make active'}
                    </button>
                )}

                {canDelete && (
                    <button
                        className="mini-btn"
                        onClick={async () => {
                            if (deleting) return;
                            setDeleting(true);
                            try {
                                await dispatch(deletePost(post.id));
                                goBackSmart(); // назад на ленту/профиль (или fallback)
                            } finally {
                                setDeleting(false);
                            }
                        }}
                        style={{ color: '#9a1c1c' }}
                        disabled={deleting}
                    >
                        {deleting ? '…Deleting' : '🗑 Delete'}
                    </button>
                )}
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
                    <CommentsTree
                        nodes={buildTree(comments)}
                        onLike={(id) => toggleCommentReaction(id, 'like')}
                        onDislike={(id) => toggleCommentReaction(id, 'dislike')}
                        replyOpenFor={replyOpenFor}
                        setReplyOpenFor={setReplyOpenFor}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        submitReply={submitReply}
                        // new props for moderation / editing
                        meId={meId}
                        isAdmin={isAdmin}
                        canEditComment={canEditComment}
                        canToggleStatus={canToggleStatus}
                        canDeleteComment={canDeleteComment}
                        startEdit={startEdit}
                        saveEdit={saveEdit}
                        cancelEdit={cancelEdit}
                        toggleCommentStatus={toggleCommentStatus}
                        deleteCommentById={deleteCommentById}
                        editingId={editingId}
                        editText={editText}
                        setEditText={setEditText}
                        busyById={busyById}
                    />
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
function CommentNode({
    node,
    level = 0,
    onLike,
    onDislike,
    replyOpenFor,
    setReplyOpenFor,
    replyText,
    setReplyText,
    submitReply,
    // new:
    meId,
    isAdmin,
    canEditComment,
    canToggleStatus,
    canDeleteComment,
    startEdit,
    saveEdit,
    cancelEdit,
    toggleCommentStatus,
    deleteCommentById,
    editingId,
    editText,
    setEditText,
    busyById = {},
}) {
    const indent = Math.min(level, 6) * 16; // макс 6 уровней визуально
    const cAva =
        assetUrl(node.author_avatar) ||
        node.author_avatar ||
        '/placeholder-avatar.png';
    const cName = node.author_login || node.author_name || 'user';
    const cDate = formatDate(node.created_at || node.createdAt);
    const isMine = Number(node.author_id) === Number(meId);
    const editing = editingId === node.id;
    const busy = !!busyById[node.id];
    const status = String(node.status || 'active');
    const isActive = status === 'active';

    return (
        <div style={{ marginLeft: indent, marginBottom: 10 }}>
            <div
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
                        e.currentTarget.src = '/placeholder-avatar.png';
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
                        style={{ fontSize: 13, marginBottom: 4 }}
                    >
                        <b>{cName}</b> · {cDate}
                        {status && (
                            <span
                                title={`Status: ${
                                    isActive ? 'active' : 'inactive'
                                }`}
                                style={{
                                    display: 'inline-block',
                                    marginLeft: 8,
                                    padding: '0 6px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    lineHeight: '18px',
                                    border: '1px solid var(--line)',
                                    background: isActive
                                        ? '#e8fff3'
                                        : '#fff5f5',
                                    color: isActive ? '#0a7f43' : '#9a1c1c',
                                }}
                            >
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        )}
                    </div>
                    {!editing ? (
                        <div
                            style={{
                                whiteSpace: 'pre-wrap',
                                opacity: isActive ? 1 : 0.75,
                            }}
                        >
                            {node.content || node.text || ''}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                                disabled={busy}
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
                                    onClick={() => saveEdit(node.id)}
                                    disabled={busy || !editText.trim()}
                                >
                                    {busy ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    className="mini-btn"
                                    onClick={cancelEdit}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        className="comment-actions"
                        style={{ display: 'flex', gap: 8, marginTop: 6 }}
                    >
                        <button
                            className={`mini-btn ${
                                node.my_reaction === 'like' || node.liked
                                    ? 'is-on'
                                    : ''
                            }`}
                            onClick={() => onLike(node.id)}
                            aria-pressed={
                                node.my_reaction === 'like' || node.liked
                            }
                            title="Like"
                            disabled={!isActive}
                        >
                            ♥ {Number(node.likes_up_count || 0)}
                        </button>

                        <button
                            className={`mini-btn ${
                                node.my_reaction === 'dislike' || node.disliked
                                    ? 'is-on'
                                    : ''
                            }`}
                            onClick={() => onDislike(node.id)}
                            aria-pressed={
                                node.my_reaction === 'dislike' || node.disliked
                            }
                            title="Dislike"
                            disabled={!isActive}
                        >
                            👎 {Number(node.likes_down_count || 0)}
                        </button>

                        <button
                            className="mini-btn"
                            onClick={() =>
                                setReplyOpenFor(
                                    replyOpenFor === node.id ? null : node.id
                                )
                            }
                            title="Reply"
                            disabled={!isActive}
                        >
                            ↩ Reply
                        </button>
                        {/* Edit — только автор */}
                        {canEditComment(node) && !editing && (
                            <button
                                className="mini-btn"
                                onClick={() => startEdit(node)}
                                disabled={busy}
                                title="Edit"
                            >
                                ✎ Edit
                            </button>
                        )}
                        {/* Status toggle — автор или админ */}
                        {canToggleStatus(node) && (
                            <button
                                className="mini-btn"
                                onClick={() => toggleCommentStatus(node)}
                                disabled={busy}
                                title={
                                    isActive ? 'Make inactive' : 'Make active'
                                }
                            >
                                {isActive ? '⏸ Make inactive' : '▶ Make active'}
                            </button>
                        )}
                        {/* Delete — автор или админ */}
                        {canDeleteComment(node) && (
                            <button
                                className="mini-btn"
                                onClick={() => deleteCommentById(node)}
                                style={{ color: '#9a1c1c' }}
                                disabled={busy}
                                title="Delete"
                            >
                                {busy ? '…Deleting' : '🗑 Delete'}
                            </button>
                        )}
                    </div>

                    {replyOpenFor === node.id && (
                        <div style={{ marginTop: 8 }}>
                            <textarea
                                placeholder={`Reply to @${cName}…`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                                disabled={!isActive}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    justifyContent: 'flex-end',
                                    marginTop: 6,
                                }}
                            >
                                <button
                                    className="mini-btn"
                                    onClick={() => submitReply(node.id)}
                                    disabled={!replyText.trim() || !isActive}
                                >
                                    Send reply
                                </button>
                                <button
                                    className="mini-btn"
                                    onClick={() => {
                                        setReplyText('');
                                        setReplyOpenFor(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* children */}
            {node.replies && node.replies.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    {node.replies.map((child) => (
                        <CommentNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onLike={onLike}
                            onDislike={onDislike}
                            replyOpenFor={replyOpenFor}
                            setReplyOpenFor={setReplyOpenFor}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            submitReply={submitReply}
                            meId={meId}
                            isAdmin={isAdmin}
                            canEditComment={canEditComment}
                            canToggleStatus={canToggleStatus}
                            canDeleteComment={canDeleteComment}
                            startEdit={startEdit}
                            saveEdit={saveEdit}
                            cancelEdit={cancelEdit}
                            toggleCommentStatus={toggleCommentStatus}
                            deleteCommentById={deleteCommentById}
                            editingId={editingId}
                            editText={editText}
                            setEditText={setEditText}
                            busyById={busyById}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CommentsTree(props) {
    return (
        <div className="comments-list" style={{ display: 'grid', gap: 10 }}>
            {props.nodes.map((n) => (
                <CommentNode key={n.id} node={n} level={0} {...props} />
            ))}
        </div>
    );
}
