import api from '../../shared/api/axios';
import { decodeJwt } from '../../shared/utils/jwt';

export const AUTH_LOADING = 'auth/LOADING';
export const AUTH_ERROR = 'auth/ERROR';
export const AUTH_SET_TOKEN = 'auth/SET_TOKEN';
export const AUTH_SET_USER = 'auth/SET_USER';
export const AUTH_LOGOUT = 'auth/LOGOUT';
export const AUTH_CLEAR_ERROR = 'auth/CLEAR_ERROR';

const setLoading = (v) => ({ type: AUTH_LOADING, payload: v });
const setError = (e) => ({ type: AUTH_ERROR, payload: e });
export const setToken = (t) => ({ type: AUTH_SET_TOKEN, payload: t });
export const setUser = (u) => ({ type: AUTH_SET_USER, payload: u });
export const logoutAction = () => ({ type: AUTH_LOGOUT });
export const clearError = () => ({ type: AUTH_CLEAR_ERROR });

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
            sessionStorage.setItem('justLoggedIn', '1');
            await dispatch(fetchMeFromToken());
        } catch (e) {
            dispatch(setError(e?.response?.data?.error || 'Login failed'));
            throw e;
        } finally {
            dispatch(setLoading(false));
        }
    };

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
                password_confirmation,
            });
        } catch (e) {
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

export const requestPasswordReset = (email) => async (dispatch) => {
    dispatch(setLoading(true));
    try {
        await api.post('/auth/password-reset', { email });
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

export const fetchMeFromToken = () => async (dispatch) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = decodeJwt(token);
    if (!payload?.id) return;
    try {
        const { data: user } = await api.get(`/users/${payload.id}`);
        dispatch(setUser(user));
    } catch (e) {
        localStorage.removeItem('token');
        dispatch(logout());
    }
};

export const logout = () => async (dispatch) => {
    try {
        await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('token');
    dispatch(logoutAction());
};
