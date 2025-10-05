// frontend/src/shared/components/FiltersBar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
const catName = (c) => c.name ?? c.title ?? c.label ?? c.slug ?? `#${c.id}`;
export default function FiltersBar({ categories = [], value, onChange }) {
    const v = value || {
        categoryIds: [],
        sortBy: 'likes_desc',
        query: '',
        dateFrom: '',
        dateTo: '',
        status: '',
    };

    // === Category dropdown state ===
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const panelRef = useRef(null);

    // Закрываем по клику вне
    useEffect(() => {
        function onDocClick(e) {
            if (!open) return;
            const t = e.target;
            if (
                panelRef.current &&
                !panelRef.current.contains(t) &&
                btnRef.current &&
                !btnRef.current.contains(t)
            ) {
                setOpen(false);
            }
        }
        function onEsc(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [open]);

    const selected = (v.categoryIds ?? []).map(String);

    const label = useMemo(() => {
        if (!selected.length) return 'All categories';
        const map = new Map(
            categories.map((c) => [String(c.id ?? c.category_id), catName(c)])
        );
        const firstName = map.get(selected[0]) || 'Selected';
        return selected.length > 1
            ? `${firstName} +${selected.length - 1}`
            : firstName;
    }, [selected, categories]);

    function toggleCategory(id) {
        const sid = String(id);
        const next = selected.includes(sid)
            ? selected.filter((x) => x !== sid)
            : [...selected, sid];
        onChange({ ...v, categoryIds: next });
    }

    function clearCategories() {
        onChange({ ...v, categoryIds: [] });
    }

    return (
        <div className="filters">
            {/* Категории — кастомный дропдаун с чекбоксами */}
            <div className="category-dd">
                <button
                    type="button"
                    className="category-dd__button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    ref={btnRef}
                >
                    {label}
                    <span className={`caret ${open ? 'up' : 'down'}`} />
                </button>

                {open && (
                    <div
                        className="category-dd__panel"
                        ref={panelRef}
                        role="menu"
                        aria-label="Categories"
                    >
                        <div className="category-dd__actions">
                            <button type="button" onClick={clearCategories}>
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                        <div className="category-dd__list">
                            {categories.length === 0 ? (
                                <div className="category-dd__empty">
                                    No categories
                                </div>
                            ) : (
                                categories.map((c) => (
                                    <label
                                        key={c.id ?? c.category_id}
                                        className="category-dd__item"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(
                                                String(c.id ?? c.category_id)
                                            )}
                                            onChange={() =>
                                                toggleCategory(
                                                    c.id ?? c.category_id
                                                )
                                            }
                                        />
                                        <span>{catName(c)}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Сортировка */}
            <select
                value={v.sortBy}
                onChange={(e) => onChange({ ...v, sortBy: e.target.value })}
            >
                <option value="likes_desc">Most liked</option>
                <option value="likes_asc">Least liked</option>
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
            </select>

            {/* Статус */}
            <select
                value={v.status}
                onChange={(e) => onChange({ ...v, status: e.target.value })}
            >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>

            {/* Даты */}
            <input
                type="date"
                value={v.dateFrom}
                onChange={(e) => onChange({ ...v, dateFrom: e.target.value })}
                title="From date"
            />
            <input
                type="date"
                value={v.dateTo}
                onChange={(e) => onChange({ ...v, dateTo: e.target.value })}
                title="To date"
            />
        </div>
    );
}
