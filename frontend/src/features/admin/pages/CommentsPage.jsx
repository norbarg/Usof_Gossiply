import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../shared/api/axios';
import DataTable from '../components/DataTable';
import { navigate } from '../../../shared/router/helpers';

const fmt = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(+d)
        ? String(v)
        : new Intl.DateTimeFormat('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
          }).format(d);
};

export default function CommentsPage() {
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(30);
    const [loading, setLoading] = useState(true);
    const [hasNext, setHasNext] = useState(false);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/comments/admin', {
                params: { page, limit, q, status },
            });
            const items =
                data?.items ?? data?.results ?? data?.data ?? data ?? [];
            setRows(items);

            const pages = Number(data?.pages ?? 0);
            const total = Number(data?.total ?? data?.count ?? 0);

            if (Number.isFinite(pages) && pages > 0) {
                setHasNext(page < pages);
            } else if (Number.isFinite(total) && total >= 0) {
                setHasNext(page * limit < total);
            } else {
                setHasNext(items.length === limit);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [page, limit, q, status]);

    useEffect(() => {
        setPage(1);
    }, [q, status]);

    const toggleStatus = async (c) => {
        const next = c.status === 'active' ? 'inactive' : 'active';
        const { data } = await api.patch(`/comments/${c.id}`, { status: next });
        setRows((prev) =>
            prev.map((x) =>
                x.id === c.id ? { ...x, status: data?.status ?? next } : x
            )
        );
    };
    const remove = async (c) => {
        if (!confirm('Delete this comment?')) return;
        await api.delete(`/comments/${c.id}`);
        setRows((prev) => prev.filter((x) => x.id !== c.id));
    };

    const columns = useMemo(
        () => [
            { key: 'id', header: 'ID', width: 64 },
            {
                key: 'post_id',
                header: 'Post',
                width: 80,
                render: (c) => (
                    <button
                        className="link-plain"
                        onClick={() =>
                            navigate(`/posts/${c.post_id}#comments-anchor`)
                        }
                    >
                        #{c.post_id}
                    </button>
                ),
            },
            {
                key: 'author_login',
                header: 'Author',
                width: 140,
                render: (c) => '@' + (c.author_login ?? ''),
            },
            { key: 'content', header: 'Text', render: (c) => c.content },
            {
                key: 'status',
                header: 'Status',
                width: 120,
                render: (c) => (
                    <span
                        className={`status-chip ${
                            c.status === 'active' ? 'on' : 'off'
                        }`}
                    >
                        {c.status}
                    </span>
                ),
            },
            {
                key: 'created_at',
                header: 'Created',
                width: 160,
                render: (c) => fmt(c.created_at),
            },
            {
                key: 'actions',
                header: '',
                width: 200,
                render: (c) => (
                    <div className="row-actions">
                        <button
                            className="mini-btn-admin"
                            onClick={() => toggleStatus(c)}
                        >
                            {c.status === 'active'
                                ? 'Make inactive'
                                : 'Make active'}
                        </button>
                        <button
                            className="mini-btn-admin danger"
                            onClick={() => remove(c)}
                        >
                            Delete
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="admin-page">
            <div className="admin-toolbar">
                <h2 className="compose-title inria-serif-bold">Comments</h2>
                <div className="grow" />
                <select
                    className="status-select -compact"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="all">all</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                </select>
                <input
                    className="admin-input"
                    placeholder="Search text…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <DataTable columns={columns} rows={rows} loading={loading} />

            <div className="admin-pager">
                <button
                    className="mini-btn-admin"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                    Prev
                </button>
                <span className="admin-pager__num">{page}</span>
                <button
                    className="mini-btn-admin"
                    disabled={!hasNext}
                    onClick={() => hasNext && setPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
