// frontend/src/features/posts/pages/PostEdit.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { matchPath, parsePath, navigate } from '../../../shared/router/helpers';
import api from '../../../shared/api/axios';
import { fetchPost, updatePost } from '../postsActions';
import { assetUrl } from '../../../shared/utils/assetUrl';

const uploadEndpoint = (postId) => `/posts/${postId}/image`;

const normalizeUploadUrl = (s) => {
    if (!s) return '';
    let u = String(s).trim().replace(/\\/g, '/');
    u = u.replace(/^\/api(\/|$)/i, '/'); // убираем /api
    u = u.replace(/^\/?uploads\/+/i, '/uploads/'); // приводим к /uploads/...
    return u;
};

// Вытянуть blocks из content (массив, {blocks}, либо JSON-строка)
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

// Собрать плейн-текст из текстовых блоков
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

// Найти первую картинку в блоках
function firstImageUrl(blocks) {
    const img = (blocks || []).find(
        (b) => String(b?.type).toLowerCase() === 'img'
    );
    return img?.url || img?.src || img?.path || '';
}

export default function PostEdit() {
    const dispatch = useDispatch();
    const { current: post } = useSelector((s) => s.posts);
    const auth = useSelector((s) => s.auth);

    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [allCats, setAllCats] = useState([]);
    const [catIds, setCatIds] = useState([]);
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef(null);

    const meId = auth?.user?.id;
    const isAdmin = auth?.user?.role === 'admin';
    const isAuthor = meId && post?.author_id === meId;

    const canEditContent = !!isAuthor;
    const canEditCategories = !!(isAuthor || isAdmin);
    const canChangeStatus = !!isAdmin;

    const onCancel = () => {
        const mark = sessionStorage.getItem('cameFromPost');
        if (mark) sessionStorage.removeItem('cameFromPost');
        if (window.history.length > 1) {
            // вернёт на страницу поста (если пришли с неё), а дальше системный Back вернёт в ленту/профиль
            history.back();
        } else {
            // если открыли /edit напрямую — просто уйдём на сам пост
            navigate(`/posts/${post?.id}`, { replace: true });
        }
    };

    useEffect(() => {
        const path = parsePath();
        const params = matchPath('/posts/:id/edit', path);
        if (params?.id) dispatch(fetchPost(params.id));
    }, [dispatch]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/categories');
                const rows = data.items ?? data.results ?? data.data ?? data;
                setAllCats(rows);
            } catch {}
        })();
    }, []);

    useEffect(() => {
        if (!post) return;
        const blocks = toBlocks(post.content);
        setTitle(post.title || '');
        setText(blocksToPlainText(blocks));
        setImageUrl(firstImageUrl(blocks) || '');
        setStatus(post.status || 'active');
    }, [post?.id]);

    useEffect(() => {
        if (!post || !Array.isArray(allCats) || !allCats.length) return;
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

    const toggleCat = (cid) => {
        setCatIds((prev) =>
            prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
        );
    };

    const uploadImage = async (file, postId) => {
        if (!file) return '';
        setUploading(true);
        try {
            const form = new FormData();
            // на бэке стоит upload.single('image') → имя поля именно 'image'
            form.append('image', file);
            const url = uploadEndpoint(postId);
            // важное: не ставим Content-Type вручную — axios сам проставит boundary
            const { data } = await api.patch(url, form);
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

    const pickAddImage = () => {
        if (!canEditContent) return;
        if (!fileInputRef.current) return;
        fileInputRef.current.onchange = async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const url = await uploadImage(f, post?.id);
            if (url) setImageUrl(url);
        };
        fileInputRef.current.click();
    };

    const pickReplaceImage = () => pickAddImage();

    const onSave = async () => {
        if (saving || !post) return;
        setSaving(true);
        try {
            const payload = { id: post.id };
            if (canEditContent) {
                payload.title = title;

                // собираем blocks из простого текста и (опционально) картинки
                const contentBlocks = [];
                const txt = (text || '').trim();
                if (txt) contentBlocks.push({ type: 'p', text: txt });
                const img = normalizeUploadUrl(imageUrl || '');
                if (img) contentBlocks.push({ type: 'img', url: img });

                payload.contentBlocks = contentBlocks;
            }
            if (canEditCategories) payload.categories = catIds;
            if (canChangeStatus) payload.status = status;

            await dispatch(updatePost(payload));
            // Сохранились из /edit → вернёмся на пост, заменив /edit в истории
            sessionStorage.removeItem('cameFromPost');
            navigate(`/posts/${post.id}`, { replace: true });
        } finally {
            setSaving(false);
        }
    };

    if (!post) return <div className="container">Loading…</div>;

    return (
        <div className="container" style={{ display: 'grid', gap: 12 }}>
            <h2 className="inria-serif-bold" style={{ marginBottom: 8 }}>
                Edit post
            </h2>

            <label className="auth-label">Title</label>
            <input
                className="auth-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditContent}
                placeholder="Title"
            />

            <label className="auth-label">Text</label>
            <textarea
                className="auth-input"
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!canEditContent}
                placeholder="Write your text…"
            />

            <label className="auth-label">Image</label>
            {imageUrl ? (
                <div style={{ display: 'grid', gap: 8 }}>
                    <img
                        src={assetUrl(imageUrl) || imageUrl}
                        alt=""
                        style={{
                            maxWidth: 360,
                            maxHeight: 240,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid var(--line)',
                        }}
                        onError={(e) =>
                            (e.currentTarget.style.display = 'none')
                        }
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="mini-btn"
                            type="button"
                            disabled={uploading || !canEditContent}
                            onClick={pickReplaceImage}
                        >
                            {uploading ? 'Uploading…' : 'Replace image'}
                        </button>
                        <button
                            className="mini-btn"
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => setImageUrl('')}
                            style={{ color: '#9a1c1c' }}
                        >
                            Remove image
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <button
                        className="mini-btn"
                        type="button"
                        disabled={uploading || !canEditContent}
                        onClick={pickAddImage}
                    >
                        {uploading ? 'Uploading…' : '+ Add image'}
                    </button>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
            />

            <label className="auth-label">Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allCats.map((c) => {
                    const cid = +c.id;
                    const checked = catIds.includes(cid);
                    return (
                        <label
                            key={cid}
                            style={{
                                border: '1px solid var(--line)',
                                borderRadius: 999,
                                padding: '4px 10px',
                                opacity: canEditCategories ? 1 : 0.6,
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canEditCategories}
                                onChange={() => toggleCat(cid)}
                                style={{ marginRight: 6 }}
                            />
                            {c.title || c.name}
                        </label>
                    );
                })}
            </div>

            {canChangeStatus && (
                <>
                    <label className="auth-label">Status</label>
                    <select
                        className="auth-input"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                    </select>
                </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="mini-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="mini-btn" onClick={onSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
}
