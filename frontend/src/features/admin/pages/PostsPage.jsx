import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../shared/api/axios';
import DataTable from '../components/DataTable';
import { navigate } from '../../../shared/router/helpers';

export default function PostsPage() {
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('desc');
    const [hasNext, setHasNext] = useState(false);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/posts', {
                params: {
                    page,
                    limit,
                    q,
                    status,
                    sortBy: `${sortBy}_${sortDir}`,
                },
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
    }, [page, limit, q, status, sortBy, sortDir]);

    useEffect(() => {
        setPage(1);
    }, [q, status]);

    const onSort = (key, dir) => {
        setSortBy(key);
        setSortDir(dir);
    };

    const toggleStatus = async (p) => {
        const next = p.status === 'active' ? 'inactive' : 'active';
        const { data } = await api.patch(`/posts/${p.id}`, { status: next });
        setRows((prev) =>
            prev.map((x) =>
                x.id === p.id ? { ...x, status: data.status ?? next } : x
            )
        );
    };

    const remove = async (p) => {
        if (!confirm('Delete this post?')) return;
        await api.delete(`/posts/${p.id}`);
        setRows((prev) => prev.filter((x) => x.id !== p.id));
    };

    const columns = useMemo(
        () => [
            { key: 'id', header: 'ID', width: 72 },
            {
                key: 'title',
                header: 'Title',
                render: (p) => (
                    <button
                        className="link-plain"
                        onClick={() => navigate(`/posts/${p.id}`)}
                    >
                        {p.title}
                    </button>
                ),
            },
            {
                key: 'author_login',
                header: 'Author',
                width: 160,
                render: (p) => '@' + (p.author?.login ?? p.author_login ?? ''),
            },
            {
                key: 'status',
                header: 'Status',
                width: 120,
                render: (p) => (
                    <span
                        className={`status-chip ${
                            p.status === 'active' ? 'on' : 'off'
                        }`}
                    >
                        {p.status}
                    </span>
                ),
            },
            {
                key: 'actions',
                header: '',
                width: 220,
                render: (p) => (
                    <div className="row-actions">
                        <button
                            className="mini-btn-admin"
                            onClick={() => navigate(`/posts/${p.id}/edit`)}
                        >
                            Edit
                        </button>
                        <button
                            className="mini-btn-admin"
                            onClick={() => toggleStatus(p)}
                        >
                            {p.status === 'active'
                                ? 'Make inactive'
                                : 'Make active'}
                        </button>
                        <button
                            className="mini-btn-admin danger"
                            onClick={() => remove(p)}
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
                <h2 className="compose-title inria-serif-bold">Posts</h2>
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
                    placeholder="Search title…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                loading={loading}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
            />

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
