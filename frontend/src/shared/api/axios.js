import axios from 'axios';
import { navigate } from '../router/helpers';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('token');
            if (location.pathname !== '/login') navigate('/login');
        }
        return Promise.reject(err);
    }
);

export default api;
