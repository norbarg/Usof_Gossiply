// МИНИ-РОУТЕР БЕЗ # (History API)

// Переход на путь
export function navigate(path) {
    if (!path.startsWith('/')) path = '/' + path;
    window.history.pushState({}, '', path);
    // вручную шлём событие, чтобы твои подписчики обновились
    window.dispatchEvent(new PopStateEvent('popstate'));
}

// Подписка на изменения маршрута
export function onRouteChange(cb) {
    const handler = () => cb(location.pathname);
    window.addEventListener('popstate', handler);
    window.addEventListener('load', handler);
    return () => {
        window.removeEventListener('popstate', handler);
        window.removeEventListener('load', handler);
    };
}

// Текущий путь (вместо parseHash)
export function parsePath() {
    return location.pathname || '/';
}

// Матчинг типа "/confirm-email/:token"
export function matchPath(pattern, actual) {
    const p = pattern.split('/').filter(Boolean);
    const a = actual.split('/').filter(Boolean);
    if (p.length !== a.length) return null;
    const params = {};
    for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(':'))
            params[p[i].slice(1)] = decodeURIComponent(a[i]);
        else if (p[i] !== a[i]) return null;
    }
    return params;
}
