// Простий хелпер для хеш-навігації
export function navigate(path) {
    if (!path.startsWith('/')) path = '/' + path;
    location.hash = '#' + path;
}

export function onRouteChange(cb) {
    window.addEventListener('hashchange', cb);
    window.addEventListener('load', cb);
    return () => {
        window.removeEventListener('hashchange', cb);
        window.removeEventListener('load', cb);
    };
}

export function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    return h;
}

// Матчинг із параметрами типу "/confirm-email/:token"
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
