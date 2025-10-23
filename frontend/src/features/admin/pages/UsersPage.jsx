import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../shared/api/axios';
import DataTable from '../components/DataTable';
import { navigate } from '../../../shared/router/helpers';

const fmt = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(+d)) return String(v);
    return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

function cmp(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    const na = +a,
        nb = +b;
    const aNum = Number.isFinite(na),
        bNum = Number.isFinite(nb);
    if (aNum && bNum) return na - nb;
    // дата?
    const da = new Date(a),
        db = new Date(b);
    if (!Number.isNaN(+da) && !Number.isNaN(+db)) return +da - +db;
    return String(a).localeCompare(String(b));
}

export default function UsersPage() {
    const [allRows, setAllRows] = useState([]);
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');

    const [creating, setCreating] = useState(false);
    const [newU, setNewU] = useState({
        login: '',
        email: '',
        full_name: '',
        password: '',
        role: 'user',
    });
    const canCreate =
        newU.login.trim() &&
        newU.email.trim() &&
        newU.full_name.trim() &&
        newU.password.trim().length >= 6;

    const fetchRows = async () => {
        setLoading(true);
        try {
            const params = {
                q,
                search: q,
                query: q,
                term: q,
                sortBy: `${sortBy}_${sortDir}`,
                sort: `${sortBy}_${sortDir}`,
            };
            const { data } = await api.get('/users', { params });
            const items =
                data?.items ?? data?.results ?? data?.data ?? data ?? [];
            setAllRows(Array.isArray(items) ? items : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    useEffect(() => {
        const lq = q.trim().toLowerCase();
        const filtered = lq
            ? allRows.filter(
                  (u) =>
                      String(u.login || '')
                          .toLowerCase()
                          .includes(lq) ||
                      String(u.email || '')
                          .toLowerCase()
                          .includes(lq)
              )
            : allRows;

        const sorted = [...filtered].sort((a, b) => {
            const av = a[sortBy],
                bv = b[sortBy];
            const s = cmp(av, bv);
            return sortDir === 'desc' ? -s : s;
        });

        const nextTotal = sorted.length;
        let safePage = page;
        const start = (safePage - 1) * limit;
        if (start >= nextTotal && safePage > 1) {
            safePage = 1;
        }
        const begin = (safePage - 1) * limit;
        const pageRows = sorted.slice(begin, begin + limit);

        setTotal(nextTotal);
        if (safePage !== page) {
            setPage(safePage);
        } else {
            setRows(pageRows);
        }
    }, [allRows, q, page, limit, sortBy, sortDir]);

    const onSort = (key, dir) => {
        setSortBy(key);
        setSortDir(dir);
    };
    const canNext = page * limit < total;

    const setRole = async (id, role) => {
        await api.patch(`/users/${id}`, { role });
        setAllRows((prev) =>
            prev.map((u) => (u.id === id ? { ...u, role } : u))
        );
    };

    const remove = async (id) => {
        if (!confirm('Delete this user?')) return;
        await api.delete(`/users/${id}`);
        setAllRows((prev) => prev.filter((u) => u.id !== id));
    };

    const createUser = async () => {
        if (!canCreate || creating) return;
        setCreating(true);
        try {
            const body = {
                login: newU.login.trim(),
                email: newU.email.trim(),
                full_name: newU.full_name.trim(),
                password: newU.password,
                password_confirmation: newU.password,
                role: newU.role || 'user',
            };
            const { data } = await api.post('/users', body);
            const created = data?.user ?? data;
            setAllRows((prev) => [created, ...prev]);
            setNewU({
                login: '',
                email: '',
                full_name: '',
                password: '',
                role: 'user',
            });
            setPage(1);
        } finally {
            setCreating(false);
        }
    };

    const columns = useMemo(
        () => [
            { key: 'id', header: 'ID', width: 72 },
            {
                key: 'login',
                header: 'Login',
                render: (u) => (
                    <button
                        className="link-plain"
                        onClick={() => navigate(`/profile/${u.id}`)}
                    >
                        @{u.login}
                    </button>
                ),
            },
            { key: 'email', header: 'Email' },
            {
                key: 'role',
                header: 'Role',
                width: 160,
                render: (u) => (
                    <select
                        className="status-select -compact"
                        value={u.role}
                        onChange={(e) => setRole(u.id, e.target.value)}
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                ),
            },
            { key: 'rating', header: 'Rating', width: 100 },
            {
                key: 'created_at',
                header: 'Created',
                width: 160,
                render: (u) => fmt(u.created_at),
            },
            {
                key: 'actions',
                header: '',
                width: 120,
                render: (u) => (
                    <div className="row-actions">
                        <button
                            className="mini-btn-admin"
                            onClick={() => navigate(`/profile/${u.id}`)}
                        >
                            View
                        </button>
                        <button
                            className="mini-btn-admin danger"
                            onClick={() => remove(u.id)}
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
                <h2 className="compose-title inria-serif-bold">Users</h2>
                <div className="grow" />
                <input
                    className="admin-input"
                    placeholder="Search login/email…"
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="admin-card" style={{ marginBottom: 10 }}>
                <div
                    style={{
                        display: 'grid',
                        gap: 8,
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(160px, 1fr))',
                    }}
                >
                    <input
                        className="admin-input"
                        placeholder="login"
                        value={newU.login}
                        onChange={(e) =>
                            setNewU((v) => ({ ...v, login: e.target.value }))
                        }
                    />
                    <input
                        className="admin-input"
                        placeholder="email"
                        value={newU.email}
                        onChange={(e) =>
                            setNewU((v) => ({ ...v, email: e.target.value }))
                        }
                    />
                    <input
                        className="admin-input"
                        placeholder="full name"
                        value={newU.full_name}
                        onChange={(e) =>
                            setNewU((v) => ({
                                ...v,
                                full_name: e.target.value,
                            }))
                        }
                    />
                    <input
                        className="admin-input"
                        placeholder="password"
                        type="password"
                        value={newU.password}
                        onChange={(e) =>
                            setNewU((v) => ({ ...v, password: e.target.value }))
                        }
                    />
                    <select
                        className="status-select -compact"
                        value={newU.role}
                        onChange={(e) =>
                            setNewU((v) => ({ ...v, role: e.target.value }))
                        }
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <button
                            className="publish-btn-admin"
                            onClick={createUser}
                            disabled={!canCreate || creating}
                        >
                            {creating ? 'Creating…' : 'Create user'}
                        </button>
                    </div>
                </div>
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
                    onClick={() => setPage((p) => p - 1)}
                >
                    Prev
                </button>
                <span className="admin-pager__num">{page}</span>
                <button
                    className="mini-btn-admin"
                    disabled={!canNext}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
