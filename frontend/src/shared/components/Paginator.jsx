import React from 'react';

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
