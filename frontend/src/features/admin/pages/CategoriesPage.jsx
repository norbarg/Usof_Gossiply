import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../shared/api/axios';
import DataTable from '../components/DataTable';

export default function CategoriesPage() {
    const [allRows, setAllRows] = useState([]); // всё, что дали с бэка
    const [rows, setRows] = useState([]); // отфильтрованное отображение
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    // грузим один раз большое кол-во и дальше фильтруем локально
    useEffect(() => {
        let stop = false;
        (async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/categories', {
                    params: { page: 1, limit: 1000 },
                });
                const items =
                    data?.items ?? data?.results ?? data?.data ?? data ?? [];
                if (!stop) setAllRows(Array.isArray(items) ? items : []);
            } finally {
                if (!stop) setLoading(false);
            }
        })();
        return () => {
            stop = true;
        };
    }, []);

    // поиск по title/description
    useEffect(() => {
        const lq = q.trim().toLowerCase();
        const filtered = lq
            ? allRows.filter(
                  (c) =>
                      String(c.title || '')
                          .toLowerCase()
                          .includes(lq) ||
                      String(c.description || '')
                          .toLowerCase()
                          .includes(lq)
              )
            : allRows;
        setRows(filtered);
    }, [q, allRows]);

    const createCat = async () => {
        const name = title.trim();
        if (!name) return;
        const body = { title: name, description: desc.trim() || null };
        const { data } = await api.post('/categories', body);
        setAllRows((prev) => [data, ...prev]); // попадёт в фильтр эффектом
        setTitle('');
        setDesc('');
    };

    const updateCat = async (c, patch) => {
        const { data } = await api.patch(`/categories/${c.id}`, patch);
        setAllRows((prev) =>
            prev.map((x) => (x.id === c.id ? { ...x, ...data } : x))
        );
    };

    const removeCat = async (c) => {
        if (!confirm('Delete this category?')) return;
        await api.delete(`/categories/${c.id}`);
        setAllRows((prev) => prev.filter((x) => x.id !== c.id));
    };

    const columns = useMemo(
        () => [
            { key: 'id', header: 'ID', width: 64 },
            {
                key: 'title',
                header: 'Title',
                render: (c) => (
                    <input
                        className="admin-input -inline"
                        value={c.title || ''}
                        onChange={(e) =>
                            updateCat(c, { title: e.target.value })
                        }
                    />
                ),
            },
            {
                key: 'description',
                header: 'Description',
                render: (c) => (
                    <input
                        className="admin-input -inline"
                        value={c.description || ''}
                        onChange={(e) =>
                            updateCat(c, { description: e.target.value })
                        }
                    />
                ),
            },
            {
                key: 'actions',
                header: '',
                width: 120,
                sortable: false,
                render: (c) => (
                    <div className="row-actions">
                        <button
                            className="mini-btn-admin danger"
                            onClick={() => removeCat(c)}
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
                <h2 className="compose-title inria-serif-bold">Categories</h2>
                <div className="grow" />
                <input
                    className="admin-input"
                    placeholder="Search…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <div className="admin-card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="admin-input"
                        placeholder="New category title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <input
                        className="admin-input"
                        placeholder="Description (optional)"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        style={{ flex: 2 }}
                    />
                    <button
                        className="publish-btn-admin"
                        onClick={createCat}
                        disabled={!title.trim()}
                    >
                        Create
                    </button>
                </div>
            </div>

            <DataTable columns={columns} rows={rows} loading={loading} />
        </div>
    );
}
