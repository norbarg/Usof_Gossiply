export function navigate(to, options = {}) {
    if (typeof to === 'number' && Number.isInteger(to)) {
        window.history.go(to);
        return;
    }
    let path = String(to ?? '/');
    if (!path.startsWith('/')) path = '/' + path;
    if (options.replace) {
        window.history.replaceState({}, '', path);
    } else {
        window.history.pushState({}, '', path);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export function back() {
    window.history.back();
}
export function forward() {
    window.history.forward();
}
function cleanPath(p) {
    const onlyPath = (p || '').split('?')[0].split('#')[0] || '/';
    const noTrailing = onlyPath.replace(/\/+$/, '');
    return noTrailing || '/';
}

export function parsePath() {
    return cleanPath(location.pathname);
}

export function onRouteChange(cb) {
    const handler = () => cb(parsePath());
    window.addEventListener('popstate', handler);
    window.addEventListener('load', handler);
    return () => {
        window.removeEventListener('popstate', handler);
        window.removeEventListener('load', handler);
    };
}

export function matchPath(pattern, actual) {
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
