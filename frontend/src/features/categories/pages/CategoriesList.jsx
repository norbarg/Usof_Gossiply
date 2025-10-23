import React, { useEffect, useState } from 'react';
import api from '../../../shared/api/axios';
import { navigate } from '../../../shared/router/helpers';
import '../../../shared/styles/feed.css';

const textOf = (c) => c.description ?? c.desc ?? c.about ?? c.text ?? '';

export default function CategoriesList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setErr(null);
                const { data } = await api.get('/categories');
                const cats =
                    data.items ?? data.results ?? data.data ?? data ?? [];
                setItems(Array.isArray(cats) ? cats : []);
            } catch (e) {
                setErr(e?.response?.data?.error || 'Failed to load categories');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openCategory = (id) => {
        const usp = new URLSearchParams(location.search);
        usp.set('category_ids', String(id));
        navigate(`/${usp.toString() ? `?${usp.toString()}` : ''}`);
    };

    return (
        <div className="container">
            <h2 className="cat-title inria-serif-bold">All Categories</h2>

            {loading && <div className="auth-muted">Loading…</div>}
            {err && <div className="auth-error">{err}</div>}

            <div className="cat-grid cat-grid--figma">
                {items.map((c, i) => (
                    <article
                        key={c.id}
                        className="cat-card cat-card--figma"
                        role="button"
                        tabIndex={0}
                        onClick={() => openCategory(c.id)}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && openCategory(c.id)
                        }
                    >
                        <span aria-hidden className="cat-card__glow" />
                        <h3 className="cat-card__title inria-serif-bold">
                            {c.name ?? c.title ?? `#${c.id}`}
                        </h3>
                        <p className="cat-card__desc">
                            {textOf(c) || (
                                <span className="auth-muted">
                                    No description
                                </span>
                            )}
                        </p>
                    </article>
                ))}
            </div>
        </div>
    );
}
