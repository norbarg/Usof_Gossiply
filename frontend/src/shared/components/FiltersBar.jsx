import React, { useEffect, useMemo, useRef, useState } from 'react';

const catName = (c) => c.name ?? c.title ?? c.label ?? c.slug ?? `#${c.id}`;

function useOutside(closeWhen) {
    const refs = useRef([]);
    useEffect(() => {
        function onDoc(e) {
            if (!closeWhen()) return;
            const t = e.target;
            const hit = refs.current.some((r) => r && r.contains(t));
            if (!hit) closeWhen(true);
        }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener(
            'keydown',
            (e) => e.key === 'Escape' && closeWhen(true)
        );
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener(
                'keydown',
                (e) => e.key === 'Escape' && closeWhen(true)
            );
        };
    }, [closeWhen]);
    return (el) => refs.current.push(el);
}

export default function FiltersBar({
    categories = [],
    value,
    onChange,
    catIconOff,
    catIconOn,
}) {
    const v = value || {
        categoryIds: [],
        sortBy: 'likes_desc',
        query: '',
        dateFrom: '',
        dateTo: '',
        status: '',
    };

    const [open, setOpen] = useState({
        cats: false,
        sort: false,
        status: false,
        date: false,
    });
    const attachOutside = useOutside((forceClose) => {
        if (forceClose === true)
            return setOpen({
                cats: false,
                sort: false,
                status: false,
                date: false,
            });
        return open.cats || open.sort || open.status || open.date;
    });

    const selected = (v.categoryIds ?? []).map(String);

    const hasCats = selected.length > 0;
    const hasSort = (v.sortBy ?? 'likes_desc') !== 'likes_desc';
    const hasStatus = !!(v.status && v.status !== '');
    const hasDate = !!(v.dateFrom || v.dateTo);

    const catsLabel = useMemo(() => {
        if (!selected.length) return 'all categories';
        const map = new Map(
            categories.map((c) => [String(c.id ?? c.category_id), catName(c)])
        );
        const first = map.get(selected[0]) || 'selected';
        return selected.length > 1 ? `${first} +${selected.length - 1}` : first;
    }, [selected, categories]);

    const sortLabel = (() => {
        switch (v.sortBy) {
            case 'likes_asc':
                return 'sorting by least liked';
            case 'date_desc':
                return 'sorting by newest';
            case 'date_asc':
                return 'sorting by oldest';
            default:
                return 'sorting by most liked';
        }
    })();

    const statusLabel =
        v.status === 'active'
            ? 'active'
            : v.status === 'inactive'
            ? 'inactive'
            : 'all';
    const dateLabel =
        v.dateFrom || v.dateTo
            ? `${v.dateFrom || '…'} — ${v.dateTo || '…'}`
            : 'date';

    function toggleCategory(id) {
        const sid = String(id);
        const next = selected.includes(sid)
            ? selected.filter((x) => x !== sid)
            : [...selected, sid];
        onChange({ ...v, categoryIds: next });
    }

    const setSort = (val) => onChange({ ...v, sortBy: val });
    const setStatus = (val) => onChange({ ...v, status: val });
    const clearDates = () => onChange({ ...v, dateFrom: '', dateTo: '' });

    return (
        <div className=" filters--bubble">
            <div className="filters">
                <div className="menu" ref={attachOutside}>
                    <button
                        type="button"
                        className={`menu__trigger chip ${
                            hasCats ? 'chip--active' : ''
                        }`}
                        onClick={() =>
                            setOpen((o) => ({
                                ...o,
                                cats: !o.cats,
                                sort: false,
                                status: false,
                                date: false,
                            }))
                        }
                        aria-expanded={open.cats}
                    >
                        filter
                    </button>
                    {open.cats && (
                        <div className="menu__panel bubble">
                            <div className="bubble__title">{catsLabel}</div>
                            <div className="bubble__list">
                                {categories.map((c) => {
                                    const id = c.id ?? c.category_id;
                                    const on = selected.includes(String(id));
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            className={`cattt bubble__item ${
                                                on ? 'is-on' : ''
                                            }`}
                                            onClick={() => toggleCategory(id)}
                                        >
                                            {catIconOff && catIconOn ? (
                                                <img
                                                    className="cat-ico"
                                                    src={
                                                        on
                                                            ? catIconOn
                                                            : catIconOff
                                                    }
                                                    alt=""
                                                    aria-hidden
                                                />
                                            ) : (
                                                <span
                                                    className={`dot ${
                                                        on ? 'on' : ''
                                                    }`}
                                                    aria-hidden
                                                />
                                            )}
                                            <span className="text">
                                                {catName(c)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="menu" ref={attachOutside}>
                    <button
                        type="button"
                        className={`menu__trigger chip ${
                            hasSort ? 'chip--active' : ''
                        }`}
                        onClick={() =>
                            setOpen((o) => ({
                                ...o,
                                sort: !o.sort,
                                cats: false,
                                status: false,
                                date: false,
                            }))
                        }
                        aria-expanded={open.sort}
                    >
                        {sortLabel}
                    </button>
                    {open.sort && (
                        <div className="menu__panel bubble">
                            <div className="bubble__list">
                                <button
                                    type="button"
                                    className={`bubble__item ${
                                        v.sortBy === 'likes_desc' ? 'is-on' : ''
                                    }`}
                                    onClick={() => setSort('likes_desc')}
                                >
                                    <span className="text">
                                        sorting by most liked
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`bubble__item ${
                                        v.sortBy === 'likes_asc' ? 'is-on' : ''
                                    }`}
                                    onClick={() => setSort('likes_asc')}
                                >
                                    <span className="text">
                                        sorting by least liked
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`bubble__item ${
                                        v.sortBy === 'date_desc' ? 'is-on' : ''
                                    }`}
                                    onClick={() => setSort('date_desc')}
                                >
                                    <span className="text">
                                        sorting by newest
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`bubble__item ${
                                        v.sortBy === 'date_asc' ? 'is-on' : ''
                                    }`}
                                    onClick={() => setSort('date_asc')}
                                >
                                    <span className="text">
                                        sorting by oldest
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="menu" ref={attachOutside}>
                    <button
                        type="button"
                        className={`menu__trigger chip ${
                            hasStatus ? 'chip--active' : ''
                        }`}
                        onClick={() =>
                            setOpen((o) => ({
                                ...o,
                                status: !o.status,
                                cats: false,
                                sort: false,
                                date: false,
                            }))
                        }
                        aria-expanded={open.status}
                    >
                        {statusLabel}
                    </button>
                    {open.status && (
                        <div className="menu__panel bubble">
                            <div className="bubble__list">
                                {[
                                    { v: '', t: 'all' },
                                    { v: 'active', t: 'active' },
                                    { v: 'inactive', t: 'inactive' },
                                ].map((opt) => (
                                    <button
                                        key={opt.v || 'all'}
                                        type="button"
                                        className={`bubble__item ${
                                            v.status === opt.v ? 'is-on' : ''
                                        }`}
                                        onClick={() => setStatus(opt.v)}
                                    >
                                        <span className="text">{opt.t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="menu" ref={attachOutside}>
                    <button
                        type="button"
                        className={`menu__trigger chip ${
                            hasDate ? 'chip--active' : ''
                        }`}
                        onClick={() =>
                            setOpen((o) => ({
                                ...o,
                                date: !o.date,
                                cats: false,
                                sort: false,
                                status: false,
                            }))
                        }
                        aria-expanded={open.date}
                    >
                        {dateLabel}
                    </button>
                    {open.date && (
                        <div className="menu__panel bubble bubble--date">
                            <div className="date-fields">
                                <label className="date-field">
                                    <span>from</span>
                                    <input
                                        type="date"
                                        value={v.dateFrom}
                                        onChange={(e) =>
                                            onChange({
                                                ...v,
                                                dateFrom: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label className="date-field">
                                    <span>to</span>
                                    <input
                                        type="date"
                                        value={v.dateTo}
                                        onChange={(e) =>
                                            onChange({
                                                ...v,
                                                dateTo: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                            </div>
                            <div className="bubble__actions">
                                <button
                                    type="button"
                                    onClick={clearDates}
                                    className="ghost"
                                >
                                    clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen((o) => ({ ...o, date: false }))
                                    }
                                >
                                    apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
