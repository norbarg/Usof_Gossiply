// МИНИ-РОУТЕР БЕЗ # (History API)

// Переход на путь
export function navigate(path) {
    if (!path.startsWith('/')) path = '/' + path;
    window.history.pushState({}, '', path);
    // вручную шлём событие, чтобы подписчики обновились
    window.dispatchEvent(new PopStateEvent('popstate'));
}

// Нормализация пути: только pathname, без query/hash и без хвостового /
function cleanPath(p) {
    const onlyPath = (p || '').split('?')[0].split('#')[0] || '/';
    const noTrailing = onlyPath.replace(/\/+$/, '');
    return noTrailing || '/';
}

// Текущий путь (только pathname)
export function parsePath() {
    return cleanPath(location.pathname);
}

// Подписка на изменения маршрута
export function onRouteChange(cb) {
    const handler = () => cb(parsePath());
    window.addEventListener('popstate', handler);
    window.addEventListener('load', handler);
    return () => {
        window.removeEventListener('popstate', handler);
        window.removeEventListener('load', handler);
    };
}

// Матчинг типа "/confirm-email/:token"
export function matchPath(pattern, actual) {
    // safety: игнорим query/hash и хвостовые слэши
    const pat = cleanPath(pattern);
    const act = cleanPath(actual);

    const p = pat.split('/').filter(Boolean);
    const a = act.split('/').filter(Boolean);
    if (p.length !== a.length) return null;

    const params = {};
    for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(':')) {
            params[p[i].slice(1)] = decodeURIComponent(a[i]);
        } else if (p[i] !== a[i]) {
            return null;
        }
    }
    return params;
}
