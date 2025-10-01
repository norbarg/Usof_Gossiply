// frontend/src/shared/api/axios.js
import axios from 'axios';
import { navigate } from '../router/helpers';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Підхоплюємо токен з localStorage перед кожним запитом
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// 401 → розлогінюємо клієнта (делікатно)
api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('token');
            // Мʼяка переадресація на логін
            if (location.pathname !== '/login') navigate('/login');
        }
        return Promise.reject(err);
    }
);

export default api;
