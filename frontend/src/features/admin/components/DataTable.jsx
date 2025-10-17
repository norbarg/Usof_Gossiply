import React from 'react';

export default function DataTable({
    columns,
    rows,
    loading,
    emptyLabel = 'No data',
    onSort,
    sortBy,
    sortDir = 'asc',
}) {
    const clickSort = (key, col) => {
        if (!onSort || col?.sortable === false) return;
        const nextDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc';
        onSort(key, nextDir);
    };

    return (
        <div className="admin-card">
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            {columns.map((c) => {
                                const key = c.sortKey || c.key;
                                const isActive = sortBy === key;
                                const sortable = c.sortable !== false;
                                return (
                                    <th key={c.key} style={{ width: c.width }}>
                                        {sortable ? (
                                            <button
                                                type="button"
                                                className="th-btn"
                                                onClick={() =>
                                                    clickSort(key, c)
                                                }
                                                title={c.header}
                                            >
                                                {c.header}
                                                {isActive && (
                                                    <span
                                                        className={`sort-arrow ${sortDir}`}
                                                    />
                                                )}
                                            </button>
                                        ) : (
                                            <span title={c.header}>
                                                {c.header}
                                            </span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="td-muted"
                                >
                                    Loading…
                                </td>
                            </tr>
                        ) : rows?.length ? (
                            rows.map((row, i) => (
                                <tr key={row.id ?? i}>
                                    {columns.map((c) => (
                                        <td key={c.key}>
                                            {c.render
                                                ? c.render(row)
                                                : String(row[c.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="td-muted"
                                >
                                    {emptyLabel}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
