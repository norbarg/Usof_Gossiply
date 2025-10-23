import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath, parsePath, navigate } from '../../../shared/router/helpers';
import api from '../../../shared/api/axios';
import { fetchPost, updatePost } from '../postsActions';
import { assetUrl } from '../../../shared/utils/assetUrl';
import uploadIconUrl from '/icons/upload.png';
import '../../../shared/styles/profile.css';

const uploadEndpoint = (postId) => `/posts/${postId}/image`;

const normalizeUploadUrl = (s) => {
    if (!s) return '';
    let u = String(s).trim().replace(/\\/g, '/');
    u = u.replace(/^\/api(\/|$)/i, '/');
    u = u.replace(/^\/?uploads\/+/i, '/uploads/');
    return u;
};

function toBlocks(content) {
    if (Array.isArray(content)) return content;
    if (content && typeof content === 'object' && Array.isArray(content.blocks))
        return content.blocks;
    if (typeof content === 'string') {
        const s = content.trim();
        if (s.startsWith('[') || s.startsWith('{')) {
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.blocks))
                    return parsed.blocks;
            } catch {}
        }
    }
    return [];
}
function blocksToPlainText(blocks) {
    try {
        return (blocks || [])
            .filter((b) => b && (b.text || b.value))
            .map((b) => b.text ?? b.value ?? '')
            .join('\n\n');
    } catch {
        return '';
    }
}
function allImageUrls(blocks) {
    return (blocks || [])
        .filter((b) => String(b?.type).toLowerCase() === 'img')
        .map((b) => b.url || b.src || b.path)
        .filter(Boolean);
}

export default function PostEdit() {
    const dispatch = useDispatch();
    const { current: post } = useSelector((s) => s.posts);
    const auth = useSelector((s) => s.auth);

    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [allCats, setAllCats] = useState([]);
    const [catIds, setCatIds] = useState([]);
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const [catsOpen, setCatsOpen] = useState(false);
    const catsBtnRef = useRef(null);
    const catsPopRef = useRef(null);
    const scrollRef = useRef(null);

    const fileInputRef = useRef(null);
    const pickModeRef = useRef({ type: 'add', index: -1 });

    const meId = auth?.user?.id;
    const isAdmin = auth?.user?.role === 'admin';
    const isAuthor = meId && post?.author_id === meId;

    const canEditContent = !!isAuthor;
    const canEditCategories = !!(isAuthor || isAdmin);
    const canChangeStatus = !!isAdmin;

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const params = matchPath('/posts/:id/edit', parsePath());
        if (params?.id) dispatch(fetchPost(params.id));
    }, [dispatch]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/categories', {
                    params: { page: 1, limit: 1000 },
                });
                const rows =
                    data.items ?? data.results ?? data.data ?? data ?? [];
                setAllCats(Array.isArray(rows) ? rows : []);
            } catch {
                setAllCats([]);
            }
        })();
    }, []);

    useEffect(() => {
        if (!post) return;
        const blocks = toBlocks(post.content);
        setTitle(post.title || '');
        setText(blocksToPlainText(blocks));
        setImages(allImageUrls(blocks));
        setStatus(post.status || 'active');
    }, [post?.id]);

    useEffect(() => {
        if (!post || !allCats.length) return;
        (async () => {
            try {
                const { data } = await api.get(`/posts/${post.id}/categories`);
                const rows = Array.isArray(data)
                    ? data
                    : data.items ?? data.results ?? data.data ?? [];
                setCatIds(rows.map((c) => +c.id));
            } catch {
                setCatIds([]);
            }
        })();
    }, [post?.id, allCats.length]);

    useEffect(() => {
        if (!catsOpen) return;
        const onClickOutside = (e) => {
            if (!catsPopRef.current || !catsBtnRef.current) return;
            if (
                !catsPopRef.current.contains(e.target) &&
                !catsBtnRef.current.contains(e.target)
            ) {
                setCatsOpen(false);
            }
        };
        const onEsc = (e) => e.key === 'Escape' && setCatsOpen(false);
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onEsc);
        };
    }, [catsOpen]);

    useEffect(() => {
        if (!catsOpen) return;
        const scroller = scrollRef.current;
        if (!scroller) return;
        const onWheel = (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                scroller.scrollLeft += e.deltaY;
            }
        };
        scroller.addEventListener('wheel', onWheel, { passive: false });
        return () => scroller.removeEventListener('wheel', onWheel);
    }, [catsOpen]);

    const toggleCat = (cid) => {
        setCatIds((prev) =>
            prev.includes(+cid)
                ? prev.filter((x) => x !== +cid)
                : [...prev, +cid]
        );
    };

    const onCancel = useCallback(() => {
        const mark = sessionStorage.getItem('cameFromPost');
        if (mark) sessionStorage.removeItem('cameFromPost');
        if (window.history.length > 1) history.back();
        else navigate(`/posts/${post?.id}`, { replace: true });
    }, [post?.id]);

    const onVeilClick = (e) => {
        if (e.target === e.currentTarget) onCancel();
    };

    const uploadImage = async (file, postId) => {
        if (!file) return '';
        setUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);
            const { data } = await api.patch(uploadEndpoint(postId), form);
            const uploaded =
                data?.url ||
                data?.path ||
                data?.location ||
                data?.file?.url ||
                data?.file?.path ||
                '';
            if (!uploaded) throw new Error('Upload: missing url in response');
            return uploaded;
        } finally {
            setUploading(false);
        }
    };
    const addImageUrl = (url) =>
        setImages((prev) => [...prev, normalizeUploadUrl(url)]);
    const replaceImageUrl = (index, url) =>
        setImages((prev) => {
            const next = prev.slice();
            next[index] = normalizeUploadUrl(url);
            return next;
        });
    const removeImageAt = (index) =>
        setImages((prev) => prev.filter((_, i) => i !== index));

    const openPicker = (type, index = -1) => {
        if (!fileInputRef.current || !post?.id) return;
        pickModeRef.current = { type, index };
        fileInputRef.current.multiple = type === 'add';
        fileInputRef.current.click();
    };
    const onFilesPicked = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        const mode = pickModeRef.current;
        try {
            setUploading(true);
            if (mode.type === 'add') {
                for (const f of files) {
                    const url = await uploadImage(f, post?.id);
                    if (url) addImageUrl(url);
                }
            } else {
                const f = files[0];
                if (f) {
                    const url = await uploadImage(f, post?.id);
                    if (url) replaceImageUrl(mode.index, url);
                }
            }
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        if (saving || !post) return;
        setSaving(true);
        setError('');
        try {
            const payload = { id: post.id };
            if (canEditContent) {
                const contentBlocks = [];
                const txt = (text || '').trim();
                if (txt) {
                    txt.split(/\n\s*\n/).forEach((p) => {
                        const t = p.trim();
                        if (t) contentBlocks.push({ type: 'p', text: t });
                    });
                }
                (images || []).forEach((u) => {
                    const img = normalizeUploadUrl(u);
                    if (img) contentBlocks.push({ type: 'img', url: img });
                });
                payload.title = title;
                payload.contentBlocks = contentBlocks;
            }
            if (canEditCategories) payload.categories = catIds;
            if (canChangeStatus) payload.status = status;

            await dispatch(updatePost(payload));
            sessionStorage.removeItem('cameFromPost');
            navigate(`/posts/${post.id}`, { replace: true });
        } catch (e) {
            setError(String(e?.message || e));
        } finally {
            setSaving(false);
        }
    };

    if (!post) return null;

    return (
        <div className="compose-veil" onClick={onVeilClick}>
            <section
                className="compose-card"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="compose-head">
                    <h2 className="compose-title inria-serif-bold">
                        Edit Post
                    </h2>
                </header>

                <div className="compose-body">
                    {error && (
                        <div
                            className="auth-error"
                            style={{ marginBottom: 10 }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="author-row">
                        <img
                            className="author-ava"
                            src={
                                assetUrl(auth?.user?.profile_picture) ||
                                '/placeholder-avatar.png'
                            }
                            alt=""
                            onError={(e) =>
                                (e.currentTarget.src =
                                    '/placeholder-avatar.png')
                            }
                        />
                        <span className="author-name">
                            @{auth?.user?.login || 'me'}
                        </span>
                        <span className="author-sep">›</span>
                        <input
                            className="title-inline inria-serif-regular"
                            placeholder="Edit Title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            disabled={!canEditContent}
                        />
                    </div>

                    <textarea
                        className="desc-area inria-serif-regular"
                        placeholder="Update Description..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={!canEditContent}
                    />

                    <div className="uploader">
                        <label
                            className="upload-btn -icon"
                            onClick={() => openPicker('add')}
                        >
                            <img
                                className="upload-ico"
                                src={uploadIconUrl}
                                alt=""
                            />
                            <span className="inria-serif-regular">
                                {uploading ? 'Uploading…' : 'Upload images'}
                            </span>
                        </label>

                        {!!images.length && (
                            <div className="img-previews">
                                {images.map((u, i) => (
                                    <div key={i} className="thumb">
                                        <img src={assetUrl(u) || u} alt="" />
                                        <button
                                            type="button"
                                            className="thumb-del"
                                            onClick={() => removeImageAt(i)}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                        <button
                                            type="button"
                                            className="thumb-repl"
                                            onClick={() =>
                                                openPicker('replace', i)
                                            }
                                            title="Replace"
                                            disabled={uploading}
                                        >
                                            ⇄
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={onFilesPicked}
                    />

                    <div className="nizz">
                        <div className="cats-picker">
                            <div className="cats-line">
                                <button
                                    ref={catsBtnRef}
                                    className="cats-toggle"
                                    onClick={() => setCatsOpen((v) => !v)}
                                >
                                    Choose Categories{' '}
                                    <span
                                        className={`arrow ${
                                            catsOpen ? 'open' : ''
                                        }`}
                                    />
                                </button>

                                <div className="cats-selected">
                                    {catIds.map((id) => {
                                        const c = allCats.find(
                                            (x) => +x.id === +id
                                        );
                                        const label =
                                            c?.name ?? c?.title ?? `#${id}`;
                                        return (
                                            <span
                                                key={id}
                                                className="sel-chip"
                                                title={label}
                                            >
                                                {label}
                                                <button
                                                    className="x"
                                                    onClick={() =>
                                                        toggleCat(id)
                                                    }
                                                    aria-label="Remove"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {catsOpen && (
                                <div ref={catsPopRef} className="cats-ribbon">
                                    <button
                                        className="ribbon-close"
                                        onClick={() => setCatsOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                    <div
                                        ref={scrollRef}
                                        className="cats-scroller"
                                    >
                                        {allCats.length ? (
                                            allCats.map((c) => {
                                                const id = +c.id;
                                                const on = catIds.includes(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        className={`chip-scroll ${
                                                            on ? 'is-on' : ''
                                                        }`}
                                                        onClick={() =>
                                                            toggleCat(id)
                                                        }
                                                        title={
                                                            c.description ||
                                                            c.desc ||
                                                            c.about ||
                                                            ''
                                                        }
                                                    >
                                                        {c.name ??
                                                            c.title ??
                                                            `#${id}`}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div
                                                className="auth-muted"
                                                style={{ padding: 8 }}
                                            >
                                                No categories
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="compose-footer two">
                            {canChangeStatus ? (
                                <div
                                    className="status-ctl"
                                    role="radiogroup"
                                    aria-label="Post status"
                                >
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={status === 'active'}
                                        className={`chip-scroll ${
                                            status === 'active' ? 'is-on' : ''
                                        }`}
                                        onClick={() => setStatus('active')}
                                        title="Make active"
                                    >
                                        <span className="status-dot on" />
                                        Active
                                    </button>

                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={status === 'inactive'}
                                        className={`chip-scroll ${
                                            status === 'inactive' ? 'is-on' : ''
                                        }`}
                                        onClick={() => setStatus('inactive')}
                                        title="Make inactive"
                                    >
                                        <span className="status-dot off" />
                                        Inactive
                                    </button>
                                </div>
                            ) : (
                                <div className="grow" />
                            )}

                            <button className="ghost-btn" onClick={onCancel}>
                                Cancel
                            </button>
                            <button
                                className="save-btn inria-serif-bold"
                                onClick={onSave}
                                disabled={saving || uploading}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
