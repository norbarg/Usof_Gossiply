// Безпечне декодування payload із JWT (без верифікації, лише читання id/role)
export function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map(
                    (c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`
                )
                .join('')
        );
        return JSON.parse(json);
    } catch (_) {
        return null;
    }
}

export function mediaUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const origin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, '');
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}
