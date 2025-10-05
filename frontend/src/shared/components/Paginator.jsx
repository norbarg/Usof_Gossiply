// frontend/src/shared/components/Paginator.jsx
import React from 'react';

/**
 * Пагинатор по страницам.
 * Пропсы:
 * - page (number)        — текущая страница (1..N)
 * - totalPages (number)  — всего страниц
 * - onPage(p: number)    — клик по странице
 */
// shared/components/Paginator.jsx
export default function Paginator({ page, limit, total, onPage }) {
    if (!total || total <= limit) return null;
    const pages = Math.ceil(total / limit);
    const prev = () => (page > 1 ? onPage(page - 1) : null);
    const next = () => (page < pages ? onPage(page + 1) : null);

    return (
        <div className="paginator">
            <button className="mini-btn" onClick={prev} disabled={page <= 1}>
                Prev
            </button>
            <span className="paginator__info">
                Page {page} / {pages}
            </span>
            <button
                className="mini-btn"
                onClick={next}
                disabled={page >= pages}
            >
                Next
            </button>
        </div>
    );
}
