import api from '../api/axios';

function guessBackendOrigin() {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (/^http:\/\/localhost:(5173|5174)$/i.test(origin)) {
        return 'http://localhost:3000';
    }
    return origin;
}

export const API_ORIGIN = (() => {
    const base = api?.defaults?.baseURL || '';
    if (/^https?:\/\//i.test(base)) {
        return new URL(base).origin;
    }
    return guessBackendOrigin();
})();

export function assetUrl(u) {
    if (!u) return '';
    let s = String(u).trim().replace(/\\/g, '/');

    s = s.replace(/^\/api(\/|$)/i, '/');

    s = s.replace(/^(\/)?uploads(?=[^/])/i, '/uploads/');
    s = s.replace(/^\/?uploads\/+/i, '/uploads/');
    if (/^uploads\//i.test(s)) s = '/' + s;

    s = s.replace(/^\/uploads\/avatars(?=\d)/i, '/uploads/avatars/');

    if (/^https?:\/\//i.test(s)) return s;

    if (
        s === '/placeholder-avatar.png' ||
        /^\/(src|assets|shared|images)\//i.test(s)
    ) {
        return s;
    }

    if (s.startsWith('/uploads/')) return API_ORIGIN + s;

    if (!s.startsWith('/')) return API_ORIGIN + '/' + s;

    return API_ORIGIN + s;
}
