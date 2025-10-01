// frontend/src/features/auth/authActions.js
import api from '../../shared/api/axios';
import { decodeJwt } from '../../shared/utils/jwt';

// ===== Action types
export const AUTH_LOADING = 'auth/LOADING';
export const AUTH_ERROR = 'auth/ERROR';
export const AUTH_SET_TOKEN = 'auth/SET_TOKEN';
export const AUTH_SET_USER = 'auth/SET_USER';
export const AUTH_LOGOUT = 'auth/LOGOUT';
export const AUTH_CLEAR_ERROR = 'auth/CLEAR_ERROR';

// ===== Action creators (sync)
const setLoading = (v) => ({ type: AUTH_LOADING, payload: v });
const setError = (e) => ({ type: AUTH_ERROR, payload: e });
export const setToken = (t) => ({ type: AUTH_SET_TOKEN, payload: t });
export const setUser = (u) => ({ type: AUTH_SET_USER, payload: u });
export const logoutAction = () => ({ type: AUTH_LOGOUT });
export const clearError = () => ({ type: AUTH_CLEAR_ERROR });

// ===== Thunks (async)

// Вход: можно отправлять login+password ИЛИ email+password (бэк сам решит).
export const login =
    ({ login, email, password }) =>
    async (dispatch) => {
        dispatch(setLoading(true));
        try {
            const { data } = await api.post('/auth/login', {
                login,
                email,
                password,
            });
            const token = data.token;
            localStorage.setItem('token', token);
            dispatch(setToken(token));
            await dispatch(fetchMeFromToken());
        } catch (e) {
            dispatch(setError(e?.response?.data?.error || 'Login failed'));
            throw e;
        } finally {
            dispatch(setLoading(false));
        }
    };

// Регистрация: по твоему бэку ДОБАВЛЯЕМ confirm_password
export const register =
    ({ login, full_name, email, password, password_confirmation }) =>
    async (dispatch) => {
        dispatch(setLoading(true));
        try {
            await api.post('/auth/register', {
                login,
                full_name,
                email,
                password,
                password_confirmation, // <— ключ как на бэке
            });
            // Бэк отправит письмо со ссылкой на свою HTML-страницу подтверждения
        } catch (e) {
            // покажем текст из ответа сервера если он есть
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                JSON.stringify(e?.response?.data) ||
                'Register failed';
            dispatch(setError(msg));
            throw e;
        } finally {
            dispatch(setLoading(false));
        }
    };

// Запрос на сброс пароля (присылает токен на почту)
export const requestPasswordReset = (email) => async (dispatch) => {
    dispatch(setLoading(true));
    try {
        await api.post('/auth/password-reset', { email });
        // токен теперь приходит письмом
    } catch (e) {
        const msg =
            e?.response?.data?.error ||
            e?.response?.data?.message ||
            'Reset request failed';
        dispatch(setError(msg));
        throw e;
    } finally {
        dispatch(setLoading(false));
    }
};

// Подтверждение сброса (установка нового пароля по токену)
export const confirmPasswordReset =
    ({ token, new_password }) =>
    async (dispatch) => {
        dispatch(setLoading(true));
        try {
            await api.post(
                `/auth/password-reset/${encodeURIComponent(token)}`,
                { new_password }
            );
        } catch (e) {
            dispatch(setError(e?.response?.data?.error || 'Reset failed'));
            throw e;
        } finally {
            dispatch(setLoading(false));
        }
    };

// Подтягиваем профиль по токену, если он есть в localStorage
export const fetchMeFromToken = () => async (dispatch) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = decodeJwt(token);
    if (!payload?.id) return;
    try {
        const { data: user } = await api.get(`/users/${payload.id}`);
        dispatch(setUser(user));
    } catch (e) {
        // токен протух → чистим и разлогиниваем
        localStorage.removeItem('token');
        dispatch(logout());
    }
};

// Выход
export const logout = () => async (dispatch) => {
    try {
        await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('token');
    dispatch(logoutAction());
};
