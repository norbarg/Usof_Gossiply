// frontend/src/features/posts/pages/PostNew.jsx
import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { navigate } from '../../../shared/router/helpers';
import api from '../../../shared/api/axios';
import { createPost } from '../postsActions';
import { assetUrl } from '../../../shared/utils/assetUrl';
import uploadIconUrl from '/icons/upload.png';
import '../../../shared/styles/profile.css';

export default function PostNew() {
    const dispatch = useDispatch();
    const { token, user } = useSelector((s) => s.auth);

    const [loading, setLoading] = useState(false);
    const [catsLoading, setCatsLoading] = useState(true);
    const [cats, setCats] = useState([]);
    const [error, setError] = useState('');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryIds, setCategoryIds] = useState([]);
    const [catsOpen, setCatsOpen] = useState(false);

    // для поповера категорий
    const catsBtnRef = useRef(null);
    const catsPopRef = useRef(null);
    const scrollRef = useRef(null);
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
    // изображения
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        if (!token) navigate('/login');
    }, [token]);

    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                setCatsLoading(true);
                const { data } = await api.get('/categories', {
                    params: { page: 1, limit: 1000 },
                });
                const rows =
                    data.items ?? data.results ?? data.data ?? data ?? [];
                if (!stop) setCats(Array.isArray(rows) ? rows : []);
            } catch {
                if (!stop) setCats([]);
            } finally {
                if (!stop) setCatsLoading(false);
            }
        })();
        return () => {
            stop = true;
        };
    }, []);

    // блокируем скролл под модалкой
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    const valid = useMemo(() => {
        const tOK = title.trim().length >= 3;
        const hasText = content.trim().length >= 1; // описание необязательно длинное
        const hasMedia = files.length > 0; // или есть картинки
        return tOK && (hasText || hasMedia);
    }, [title, content, files.length]);

    const toggleCat = (id) => {
        const s = String(id);
        setCategoryIds((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    };
    const onPickFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        const imgs = picked.filter((f) => /^image\//i.test(f.type));
        setFiles((prev) => [...prev, ...imgs]);
    };

    useEffect(() => {
        const urls = files.map((f) => URL.createObjectURL(f));
        setPreviews(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [files]);

    const removeFile = (idx) =>
        setFiles((prev) => prev.filter((_, i) => i !== idx));

    const onSubmit = async () => {
        // ← всегда публикуем как active
        if (!valid || loading) return;
        setLoading(true);
        setError('');
        try {
            const blocks = [{ type: 'p', text: content.trim() }];
            const created = await dispatch(
                createPost({
                    title: title.trim(),
                    contentBlocks: blocks,
                    categories: categoryIds,
                    desiredStatus: 'active', // ← фиксировано
                })
            );

            // загрузка картинок по очереди
            if (files.length) {
                const urls = [];
                for (const f of files) {
                    const fd = new FormData();
                    fd.append('image', f);
                    try {
                        const { data } = await api.patch(
                            `/posts/${created.id}/image`,
                            fd,
                            {
                                headers: {
                                    'Content-Type': 'multipart/form-data',
                                },
                            }
                        );
                        if (data?.url) urls.push(data.url);
                    } catch {}
                }
                if (urls.length) {
                    const withImages = [
                        ...blocks,
                        ...urls.map((url) => ({ type: 'img', url })),
                    ];
                    try {
                        await api.patch(`/posts/${created.id}`, {
                            content: withImages,
                        });
                    } catch {}
                }
            }
            navigate('/');
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };
    const onKeyDown = useCallback(
        (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
            }
        },
        [title, content, categoryIds, loading]
    );
    useEffect(() => {
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    // закрытие по клику по подложке
    const onVeilClick = (e) => {
        if (e.target === e.currentTarget) navigate(-1);
    };

    // когда открыт поповер — конвертируем вертикальное колесо в горизонтальный скролл
    useEffect(() => {
        if (!catsOpen) return;
        const scroller = scrollRef.current;
        if (!scroller) return;

        const onWheel = (e) => {
            // если крутим вертикально — скроллим по X и блокируем прокрутку фона
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                scroller.scrollLeft += e.deltaY;
            }
        };

        scroller.addEventListener('wheel', onWheel, { passive: false });
        return () => scroller.removeEventListener('wheel', onWheel);
    }, [catsOpen]);

    return (
        <div className="compose-veil" onClick={onVeilClick}>
            <section
                className="compose-card"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="compose-head">
                    <h2 className="compose-title inria-serif-bold">New Post</h2>
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

                    {/* строка автора + инлайн title */}
                    <div className="author-row">
                        <img
                            className="author-ava"
                            src={
                                assetUrl(user?.profile_picture) ||
                                '/placeholder-avatar.png'
                            }
                            alt=""
                            onError={(e) =>
                                (e.currentTarget.src =
                                    '/placeholder-avatar.png')
                            }
                        />
                        <span className="author-name">
                            @{user?.login || 'me'}
                        </span>
                        <span className="author-sep">›</span>
                        <input
                            className="title-inline inria-serif-regular"
                            placeholder="Add Title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* описание — фикс. ширина/высота */}
                    <textarea
                        className="desc-area inria-serif-regular"
                        placeholder="Enter Description..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    {/* загрузка изображений — с иконкой */}
                    <div className="uploader">
                        <label className="upload-btn -icon">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={onPickFiles}
                            />
                            <img
                                className="upload-ico"
                                src={uploadIconUrl}
                                alt=""
                            />
                            <span className="inria-serif-regular">
                                Upload images
                            </span>
                        </label>

                        {!!previews.length && (
                            <div className="img-previews">
                                {previews.map((src, i) => (
                                    <div key={i} className="thumb">
                                        <img src={src} alt={`img-${i}`} />
                                        <button
                                            type="button"
                                            className="thumb-del"
                                            onClick={() => removeFile(i)}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="nizz">
                        {/* категории — лента-поповер + выбранные рядом с кнопкой */}
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

                                {/* выбранные категории рядом с кнопкой */}
                                <div className="cats-selected">
                                    {categoryIds.map((id) => {
                                        const c = cats.find(
                                            (x) =>
                                                String(
                                                    x.id ?? x.category_id
                                                ) === String(id)
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
                                        {catsLoading ? (
                                            <div
                                                className="auth-muted"
                                                style={{ padding: 8 }}
                                            >
                                                Loading…
                                            </div>
                                        ) : cats?.length ? (
                                            cats.map((c) => {
                                                const id =
                                                    c.id ?? c.category_id;
                                                const on = categoryIds.includes(
                                                    String(id)
                                                );
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

                        {/* футер — оставляем только Publish */}
                        <div className="compose-footer single">
                            <div className="grow" />
                            <button
                                className="publish-btn inria-serif-bold"
                                onClick={onSubmit}
                                disabled={!valid || loading}
                                title="Cmd/Ctrl + Enter"
                            >
                                {loading ? 'Publishing…' : 'Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
