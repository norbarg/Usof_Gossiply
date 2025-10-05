import api from '../api/axios';

// если baseURL относительный ("/api"), стараемся угадать origin бэкенда
function guessBackendOrigin() {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    // vite dev обычно 5173/5174 — бэкенд на 3000
    if (/^http:\/\/localhost:(5173|5174)$/i.test(origin)) {
        return 'http://localhost:3000';
    }
    return origin;
}

// ✅ если baseURL абсолютный — берём его origin; если относительный — угадываем (3000 в деве)
export const API_ORIGIN = (() => {
    const base = api?.defaults?.baseURL || '';
    if (/^https?:\/\//i.test(base)) {
        return new URL(base).origin; // напр. http://localhost:3000
    }
    return guessBackendOrigin(); // напр. http://localhost:3000
})();

export function assetUrl(u) {
    if (!u) return '';
    let s = String(u).trim().replace(/\\/g, '/');

    // убрать возможный префикс /api
    s = s.replace(/^\/api(\/|$)/i, '/');

    // "/uploadsavatars..." -> "/uploads/avatars..."
    s = s.replace(/^(\/)?uploads(?=[^/])/i, '/uploads/');
    // "uploads//avatars" -> "/uploads/avatars"
    s = s.replace(/^\/?uploads\/+/i, '/uploads/');
    // если начинается с "uploads/..." — добавим ведущий слэш
    if (/^uploads\//i.test(s)) s = '/' + s;

    // "/uploads/avatars123.jpg" -> "/uploads/avatars/123.jpg"
    s = s.replace(/^\/uploads\/avatars(?=\d)/i, '/uploads/avatars/');

    // абсолютные URL — как есть
    if (/^https?:\/\//i.test(s)) return s;

    // плейсхолдеры/локальные ассеты фронта — не трогаем
    if (
        s === '/placeholder-avatar.png' ||
        /^\/(src|assets|shared|images)\//i.test(s)
    ) {
        return s;
    }

    // всё под /uploads — всегда с API_ORIGIN (бэк)
    if (s.startsWith('/uploads/')) return API_ORIGIN + s;

    // относительные пути — тоже к бэку
    if (!s.startsWith('/')) return API_ORIGIN + '/' + s;

    // по умолчанию — бэк
    return API_ORIGIN + s;
}
