// frontend/src/features/posts/pages/PostDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
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
// Pretty date: "November 15, 2025 at 12:28"
function formatUSDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    const date = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(d);
    const time = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);
    return `${date} at ${time}`;
}

// === drag-scroll helper ===
function useDragScroll(ref) {
    const state = useRef({
        down: false,
        startX: 0,
        scrollLeft: 0,
        moved: false,
    });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return; // только ЛКМ
            el.setPointerCapture?.(e.pointerId);
            e.preventDefault();
            state.current = {
                down: true,
                startX: e.clientX ?? (e.touches?.[0]?.clientX || 0),
                scrollLeft: el.scrollLeft,
                moved: false,
            };
            el.classList.add('dragging');
        };
        const onMove = (e) => {
            if (!state.current.down) return;
            const x = e.clientX ?? (e.touches?.[0]?.clientX || 0);
            const dx = x - state.current.startX;
            if (Math.abs(dx) > 3) state.current.moved = true;
            el.scrollLeft = state.current.scrollLeft - dx;
        };
        const end = () => {
            if (!state.current.down) return;
            state.current.down = false;
            // небольшая задержка, чтобы клики после драга не срабатывали
            state.current.justDraggedAt = Date.now();
            el.classList.remove('dragging');
        };
        const onWheel = (e) => {
            e.preventDefault();
        };

        el.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', end, { passive: true });
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', end);
            el.removeEventListener('wheel', onWheel);
        };
    }, [ref]);

    const suppressClick = () => {
        const s = state.current;
        if (s.moved) return true;
        if (s.justDraggedAt && Date.now() - s.justDraggedAt < 120) return true;
        return false;
    };
    return { suppressClickRef: { current: suppressClick } };
}

// === lightbox ===
function Lightbox({ items, index, onClose, setIndex }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
            if (e.key === 'ArrowLeft') setIndex?.((i) => Math.max(0, i - 1));
            if (e.key === 'ArrowRight')
                setIndex?.((i) => Math.min(items.length - 1, i + 1));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [items?.length, onClose, setIndex]);

    if (!items || index == null) return null;
    const it = items[index] || {};
    return (
        <div className="lb-backdrop" onClick={onClose}>
            <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
                <button
                    className="lb-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                {items.length > 1 && (
                    <>
                        <button
                            className="lb-nav left"
                            onClick={() => setIndex((i) => Math.max(0, i - 1))}
                        >
                            ‹
                        </button>
                        <button
                            className="lb-nav right"
                            onClick={() =>
                                setIndex((i) =>
                                    Math.min(items.length - 1, i + 1)
                                )
                            }
                        >
                            ›
                        </button>
                    </>
                )}
                <img src={it.src} alt={it.alt || ''} />
                {it.caption && <div className="lb-caption">{it.caption}</div>}
            </div>
        </div>
    );
}

// === horizontal media strip (group of imgs) ===
function MediaStrip({ items, onOpen }) {
    const rowRef = useRef(null);
    const { suppressClickRef } = useDragScroll(rowRef);

    return (
        <div className="media-strip">
            <div className="media-row" ref={rowRef}>
                {items.map((it, idx) => (
                    <figure
                        key={idx}
                        className="media-card"
                        onClick={() => {
                            if (suppressClickRef.current()) return;
                            onOpen(idx);
                        }}
                    >
                        <img src={it.src} alt={it.alt || ''} />
                        {it.caption && <figcaption>{it.caption}</figcaption>}
                    </figure>
                ))}
            </div>
        </div>
    );
}

// === Blocks with grouping consecutive images into strips ===
function Blocks({ blocks }) {
    const [lb, setLb] = useState({ items: null, index: null });

    const openLightbox = (items, startIdx) => {
        setLb({ items, index: startIdx });
    };
    const setIndex = (updater) => {
        setLb((prev) => ({
            ...prev,
            index:
                typeof updater === 'function' ? updater(prev.index) : updater,
        }));
    };

    // Разбиваем: последовательности IMG -> MediaStrip, остальное рендерим как есть
    const out = [];
    let buffer = []; // собранные IMG
    const flush = () => {
        if (buffer.length) {
            out.push(
                <MediaStrip
                    key={`strip-${out.length}`}
                    items={buffer}
                    onOpen={(idx) => openLightbox(buffer, idx)}
                />
            );
            buffer = [];
        }
    };

    (blocks || []).forEach((b, i) => {
        const t = String(b?.type || '').toLowerCase();
        if (t === 'img') {
            const src =
                assetUrl(b.url || b.src || b.path) || b.url || b.src || b.path;
            if (src) {
                buffer.push({
                    src,
                    alt: b.alt || '',
                    caption: b.caption || '',
                });
            }
        } else {
            flush();
            if (t === 'p')
                out.push(<p key={`p-${i}`}>{b.text || b.value || ''}</p>);
            else if (t === 'h2')
                out.push(<h2 key={`h2-${i}`}>{b.text || ''}</h2>);
            else if (t === 'h3')
                out.push(<h3 key={`h3-${i}`}>{b.text || ''}</h3>);
            else if (t === 'ul') {
                out.push(
                    <ul key={`ul-${i}`}>
                        {(b.items || []).map((li, k) => (
                            <li key={k}>{li}</li>
                        ))}
                    </ul>
                );
            }
        }
    });
    flush();

    return (
        <>
            <div className="post-content">{out}</div>
            {lb.items && (
                <Lightbox
                    items={lb.items}
                    index={lb.index}
                    setIndex={setIndex}
                    onClose={() => setLb({ items: null, index: null })}
                />
            )}
        </>
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
function useClickAway(ref, onAway) {
    useEffect(() => {
        const onDoc = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onAway?.();
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [ref, onAway]);
}
function CommentActionsMenu({
    isActive,
    canEdit,
    canToggle,
    canDelete,
    onEdit,
    onToggle,
    onDelete,
    busy,
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useClickAway(wrapRef, () => setOpen(false));

    return (
        <div className="kebab-wrap" ref={wrapRef}>
            <button
                className="kebab-btn-comment"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                title="Actions"
                disabled={busy}
            >
                <img
                    className="ico-comment"
                    src="/icons/more.png"
                    alt="more"
                    onError={(e) =>
                        e.currentTarget.replaceWith(
                            document.createTextNode('⋯')
                        )
                    }
                />
            </button>

            {open && (
                <div className="popover-menu" role="menu">
                    {canEdit && (
                        <button
                            className="popover-item"
                            onClick={() => {
                                setOpen(false);
                                onEdit?.();
                            }}
                        >
                            <img
                                className="ico"
                                src="/icons/settings.png"
                                alt=""
                            />
                            <span>Edit</span>
                        </button>
                    )}
                    {canToggle && (
                        <button
                            className="popover-item"
                            onClick={() => {
                                setOpen(false);
                                onToggle?.();
                            }}
                        >
                            <img className="ico" src="/icons/eye.png" alt="" />
                            <span>
                                {isActive ? 'Make inactive' : 'Make active'}
                            </span>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className="popover-item danger"
                            onClick={() => {
                                setOpen(false);
                                onDelete?.();
                            }}
                            disabled={busy}
                        >
                            <img
                                className="ico"
                                src="/icons/delete.png"
                                alt=""
                            />
                            <span>{busy ? '…Deleting' : 'Delete'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function PostActionsMenu({
    isActive,
    canEdit,
    canToggle,
    canDelete,
    onEdit,
    onToggle,
    onDelete,
    deleting,
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useClickAway(wrapRef, () => setOpen(false));

    return (
        <div className="kebab-wrap" ref={wrapRef}>
            <button
                className="kebab-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                title="Actions"
            >
                {/* заменили текст на иконку */}
                <img
                    className="ico"
                    src="/icons/more.png"
                    alt="more"
                    onError={(e) => {
                        e.currentTarget.replaceWith(
                            document.createTextNode('⋯')
                        );
                    }}
                />
            </button>

            {open && (
                <div className="popover-menu" role="menu">
                    {canEdit && (
                        <button
                            className="popover-item"
                            onClick={() => {
                                setOpen(false);
                                onEdit();
                            }}
                        >
                            <img
                                className="ico"
                                src="/icons/settings.png"
                                alt=""
                            />
                            <span>Edit post</span>
                        </button>
                    )}
                    {canToggle && (
                        <button
                            className="popover-item"
                            onClick={() => {
                                setOpen(false);
                                onToggle();
                            }}
                        >
                            <img
                                className="ico"
                                src={
                                    isActive
                                        ? '/icons/eye.png'
                                        : '/icons/eye.png'
                                }
                                alt=""
                            />
                            <span>
                                {isActive ? 'Make inactive' : 'Make active'}
                            </span>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className="popover-item danger"
                            onClick={() => {
                                setOpen(false);
                                onDelete();
                            }}
                            disabled={!!deleting}
                        >
                            <img
                                className="ico"
                                src="/icons/delete.png"
                                alt=""
                            />
                            <span>
                                {deleting ? '…Deleting' : 'Delete post'}
                            </span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
// где-нибудь рядом с другими утилитами
const asBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes';
    }
    return false;
};

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
    const [busyById, setBusyById] = useState({});

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
                if (ok === false) goBackSmart();
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

    useEffect(() => {
        if (!post?.id) return;

        // будуємо абсолютний/відносний URL з урахуванням axios baseURL
        const base = (api?.defaults?.baseURL || '').replace(/\/+$/, ''); // напр., "/api"
        const streamUrl = `${base}/posts/${post.id}/comments/stream`;

        const es = new EventSource(streamUrl);

        es.addEventListener('hello', () => {
            /* no-op */
        });

        es.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                switch (msg?.type) {
                    case 'created': {
                        const cm = msg.comment;
                        if (!cm) break;
                        setComments((prev) =>
                            prev.some((x) => x.id === cm.id)
                                ? prev
                                : [...prev, cm]
                        );
                        break;
                    }
                    case 'updated': {
                        const cm = msg.comment;
                        if (!cm) break;
                        setComments((prev) =>
                            prev.map((x) =>
                                x.id === cm.id ? { ...x, ...cm } : x
                            )
                        );
                        break;
                    }
                    case 'deleted': {
                        const id = msg.id;
                        if (!id) break;
                        // прибираємо вузол + однорівневих дітей (у тебе є removeSubtreeLocal; тут — спрощено)
                        setComments((prev) =>
                            prev.filter(
                                (c) => c.id !== id && c.parent_id !== id
                            )
                        );
                        break;
                    }
                    case 'status': {
                        const { id, status } = msg;
                        if (!id) break;
                        setComments((prev) =>
                            prev.map((x) =>
                                x.id === id ? { ...x, status } : x
                            )
                        );
                        break;
                    }
                    case 'reaction': {
                        const { id, likes_up_count, likes_down_count } = msg;
                        if (!id) break;
                        setComments((prev) =>
                            prev.map((x) =>
                                x.id === id
                                    ? {
                                          ...x,
                                          likes_up_count: Number(
                                              likes_up_count ??
                                                  x.likes_up_count ??
                                                  0
                                          ),
                                          likes_down_count: Number(
                                              likes_down_count ??
                                                  x.likes_down_count ??
                                                  0
                                          ),
                                      }
                                    : x
                            )
                        );
                        break;
                    }
                    default:
                        break;
                }
            } catch (_) {}
        };

        es.onerror = () => {
            /* браузер сам реконектиться; можна ігнорити */
        };

        return () => es.close();
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
    const isBusy = (id) => !!busyById[id];

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
            const likedFlag = c.my_reaction
                ? c.my_reaction === 'like'
                : asBool(c.liked);
            const dislikedFlag = c.my_reaction
                ? c.my_reaction === 'dislike'
                : asBool(c.disliked);
            const current = likedFlag
                ? 'like'
                : dislikedFlag
                ? 'dislike'
                : null;
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
    const canEditContent = isAuthor;
    const canEditCategories = isAuthor || isAdmin;
    const canChangeStatus = isAdmin; // только админ
    const canDelete = isAuthor || isAdmin;

    const created = formatUSDate(
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

    const likesUp = Number(
        post.likes_up_count ?? post.likes_count ?? post.likes ?? 0
    );
    const likesDown = Number(post.likes_down_count ?? 0);
    const favCount = Number(post.favorites_count ?? post.favorites ?? 0);
    const isActivePost = String(post.status || '').toLowerCase() === 'active';

    // состояния пользователя по посту
    const iLike = post.my_reaction === 'like' || post.liked === true;
    const iDislike = post.my_reaction === 'dislike' || post.disliked === true;
    const iFav = !!(post.favorited || post.is_favorite || post.my_favorite);

    const onLikePost = () => dispatch(toggleLike(post.id));
    const onDislikePost = () => dispatch(toggleDislike(post.id));
    const onFavPost = () => dispatch(toggleFavorite(post.id));

    return (
        <div className="container post-details-page">
            <button className="auth-backline" onClick={handleBack}>
                <span className="arrow" /> Back
            </button>

            <div className="post-hero">
                <div className="post-title-row">
                    <h1 className="inria-serif-bold post-title">
                        {post.title}
                    </h1>
                    {!isActivePost && (
                        <span
                            className="status-pill inactive"
                            role="status"
                            aria-label="Post is inactive"
                            title="Post is inactive (hidden from feed)"
                        >
                            Inactive
                        </span>
                    )}
                    <div className="post-title-actions">
                        {/* TOP favorite */}
                        <button
                            className={`icon-btn ${iFav ? 'is-on' : ''}`}
                            onClick={onFavPost}
                            aria-pressed={iFav}
                            title={
                                iFav
                                    ? 'Remove from favorites'
                                    : 'Save to favorites'
                            }
                        >
                            <img
                                className="ico"
                                src={
                                    iFav
                                        ? '/icons/fav_on.png'
                                        : '/icons/fav_off.png'
                                }
                                alt=""
                            />
                        </button>

                        {(canEditContent ||
                            canEditCategories ||
                            canChangeStatus ||
                            canDelete) && (
                            <PostActionsMenu
                                isActive={isActivePost}
                                canEdit={canEditContent || canEditCategories}
                                canToggle={canChangeStatus}
                                canDelete={canDelete}
                                onEdit={() => {
                                    sessionStorage.setItem('cameFromPost', '1');
                                    navigate(`/posts/${post.id}/edit`);
                                }}
                                onToggle={async () => {
                                    const next =
                                        post.status === 'active'
                                            ? 'inactive'
                                            : 'active';
                                    await dispatch(
                                        updatePost({
                                            id: post.id,
                                            status: next,
                                        })
                                    );
                                }}
                                onDelete={async () => {
                                    if (deleting) return;
                                    setDeleting(true);
                                    try {
                                        await dispatch(deletePost(post.id));
                                        goBackSmart();
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                                deleting={deleting}
                            />
                        )}
                    </div>
                </div>

                {/* разделитель после шапки */}
                <div className="post-divider" />

                {/* автор и мета */}
                <div
                    className="author-row-post"
                    role="button"
                    tabIndex={0}
                    onClick={() => authorId && navigate(`/profile/${authorId}`)}
                    onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') &&
                        authorId &&
                        navigate(`/profile/${authorId}`)
                    }
                >
                    <img
                        src={authorAvatar || '/placeholder-avatar.png'}
                        onError={(e) =>
                            (e.currentTarget.src = '/placeholder-avatar.png')
                        }
                        alt=""
                    />
                    <div className="author-name-post">@{authorLogin}</div>
                </div>
            </div>

            {/* Контент */}
            <Content
                content={post.content || post.content_html || post.contentHtml}
            />

            {/* Футер поста с метриками/тегами и датой справа */}
            <div className="post-footer">
                <div className="footer-left">
                    <div className="footer-actions">
                        <button
                            className={`action-btn ${iLike ? 'is-on' : ''}`}
                            onClick={onLikePost}
                            aria-pressed={iLike}
                            title="Like"
                        >
                            <img
                                className="ico"
                                src={
                                    iLike
                                        ? '/icons/like-on.png'
                                        : '/icons/like-off.png'
                                }
                                alt=""
                            />
                            <span>{likesUp}</span>
                        </button>

                        <button
                            className={`action-btn ${iDislike ? 'is-on' : ''}`}
                            onClick={onDislikePost}
                            aria-pressed={iDislike}
                            title="Dislike"
                        >
                            <img
                                className="ico"
                                src={
                                    iDislike
                                        ? '/icons/dislike-on.png'
                                        : '/icons/dislike-off.png'
                                }
                                alt=""
                            />
                            <span>{likesDown}</span>
                        </button>
                    </div>

                    {categoryName && (
                        <div className="chips">
                            {String(categoryName)
                                .split(',')
                                .map((n, i) => (
                                    <span key={i} className="chip-post">
                                        {n.trim()}
                                    </span>
                                ))}
                        </div>
                    )}
                </div>

                <div className="right">{created}</div>
            </div>

            {/* Комментарии */}
            <div style={{ marginTop: 18 }}>
                <h3 className="inria-serif-bold section-title">Comments</h3>

                {/* Форма добавления комментария — над списком */}
                <div className="comments-input-wrap">
                    {auth?.token ? (
                        <div className="comment-input-row">
                            <input
                                className="comment-input"
                                type="text"
                                placeholder="your comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey)
                                        submitComment();
                                }}
                                disabled={sending}
                            />
                            <button
                                className="comment-send"
                                onClick={submitComment}
                                disabled={sending || !newComment.trim()}
                                aria-label="Send comment"
                                title="Send"
                            >
                                <img
                                    className="ico"
                                    src="/icons/send.png"
                                    alt=""
                                />
                            </button>
                        </div>
                    ) : (
                        <div className="auth-muted">
                            To comment, please sign in.
                        </div>
                    )}
                </div>

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
            </div>

            <div id="comments-anchor" />
        </div>
    );
}
function CommentNode(props) {
    const {
        node,
        level = 0,
        onLike,
        onDislike,
        replyOpenFor,
        setReplyOpenFor,
        replyText,
        setReplyText,
        submitReply,
        meId,
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
    } = props;
    const { node: _parentNode, level: _parentLevel, ...restProps } = props;
    const indent = Math.min(level, 6) * 16;
    const [showReplies, setShowReplies] = useState(false);

    const isLiked = node.my_reaction === 'like' || asBool(node.liked);
    const isDisliked = node.my_reaction === 'dislike' || asBool(node.disliked);

    const cAva =
        assetUrl(node.author_avatar) ||
        node.author_avatar ||
        '/placeholder-avatar.png';
    const cName = node.author_login || node.author_name || 'user';
    const cDate = formatUSDate(node.created_at || node.createdAt);
    const editing = editingId === node.id;
    const busy = !!busyById[node.id];
    const status = String(node.status || 'active');
    const isActive = status === 'active';

    return (
        <div className="comment-node">
            <div className="comment-row comment-grid">
                {/* col: avatar */}
                <img
                    className="c-ava"
                    src={cAva}
                    onClick={() =>
                        node.author_id && navigate(`/profile/${node.author_id}`)
                    }
                    style={{ cursor: 'pointer' }}
                    onError={(e) =>
                        (e.currentTarget.src = '/placeholder-avatar.png')
                    }
                    alt=""
                />

                {/* col: main content */}
                <div className="c-main">
                    {/* header: name + status; kebab сидит в правой колонке */}
                    <div className="c-head">
                        <div className="c-author">
                            <button
                                className="link-plain"
                                onClick={() =>
                                    node.author_id &&
                                    navigate(`/profile/${node.author_id}`)
                                }
                            >
                                @{cName}
                            </button>
                            {status && (
                                <span
                                    className={`c-status ${
                                        isActive ? 'on' : 'off'
                                    }`}
                                >
                                    {isActive ? 'Active' : 'Inactive'}
                                </span>
                            )}
                        </div>
                    </div>

                    {!editing ? (
                        <div className={`c-text ${!isActive ? 'is-dim' : ''}`}>
                            {node.content || node.text || ''}
                        </div>
                    ) : (
                        <div className="c-edit">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                disabled={busy}
                            />
                            <div className="c-edit-actions">
                                <button
                                    className="mini-btn"
                                    onClick={cancelEdit}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="mini-btn "
                                    onClick={() => saveEdit(node.id)}
                                    disabled={busy || !editText.trim()}
                                >
                                    {busy ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* bottom left: reply toggle + inline reply form */}
                    <div className="c-bottom-left">
                        <button
                            className="reply-link"
                            onClick={() =>
                                setReplyOpenFor(
                                    replyOpenFor === node.id ? null : node.id
                                )
                            }
                            disabled={!isActive}
                            title="Reply"
                        >
                            reply…
                        </button>
                    </div>

                    {replyOpenFor === node.id && (
                        <div className="c-reply-form">
                            <textarea
                                placeholder={`Reply to @${cName}…`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                disabled={!isActive}
                            />
                            <div className="c-reply-actions">
                                <button
                                    className="mini-btn"
                                    onClick={() => {
                                        setReplyText('');
                                        setReplyOpenFor(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="mini-btn"
                                    onClick={() => submitReply(node.id)}
                                    disabled={!replyText.trim() || !isActive}
                                >
                                    Send reply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* col: right rail (kebab + reactions + date) */}
                <div className="c-right">
                    <CommentActionsMenu
                        isActive={isActive}
                        canEdit={canEditComment(node) && !editing}
                        canToggle={canToggleStatus(node)}
                        canDelete={canDeleteComment(node)}
                        onEdit={() => startEdit(node)}
                        onToggle={() => toggleCommentStatus(node)}
                        onDelete={() => deleteCommentById(node)}
                        busy={busy}
                    />

                    <div className="c-reactions">
                        <button
                            onClick={() => onLike(node.id)}
                            className={`c-action ${isLiked ? 'is-on' : ''}`}
                            aria-pressed={isLiked}
                            disabled={!isActive || busy}
                            title="Like"
                        >
                            <img
                                className="ico"
                                src={
                                    isLiked
                                        ? '/icons/com-like-on.png'
                                        : '/icons/com-like-off.png'
                                }
                                alt=""
                            />
                            <span>{Number(node.likes_up_count || 0)}</span>
                        </button>

                        <button
                            onClick={() => onDislike(node.id)}
                            className={`c-action ${isDisliked ? 'is-on' : ''}`}
                            aria-pressed={isDisliked}
                            disabled={!isActive}
                            title="Dislike"
                        >
                            <img
                                className="ico"
                                src={
                                    isDisliked
                                        ? '/icons/com-dislike-on.png'
                                        : '/icons/com-dislike-off.png'
                                }
                                alt=""
                            />
                            <span>{Number(node.likes_down_count || 0)}</span>
                        </button>
                    </div>

                    <div className="c-date">{cDate}</div>
                </div>
            </div>

            {/* children */}
            {node.replies && node.replies.length > 0 && (
                <div className="replies-area">
                    {!showReplies ? (
                        <button
                            className="show-replies-btn"
                            onClick={() => setShowReplies(true)}
                        >
                            Show replies ({node.replies.length})
                        </button>
                    ) : (
                        <>
                            {node.replies.map((child) => (
                                <CommentNode
                                    key={child.id}
                                    {...restProps} // тут точно нет node/level
                                    node={child}
                                    level={level + 1}
                                />
                            ))}
                            <button
                                className="show-replies-btn"
                                onClick={() => setShowReplies(false)}
                            >
                                Hide replies
                            </button>
                        </>
                    )}
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
