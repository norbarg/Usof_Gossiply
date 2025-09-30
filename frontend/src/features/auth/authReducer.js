import {
    AUTH_LOADING,
    AUTH_ERROR,
    AUTH_SET_TOKEN,
    AUTH_SET_USER,
    AUTH_LOGOUT,
} from './authActions';

const initial = {
    loading: false,
    error: null,
    token: localStorage.getItem('token') || null,
    user: null,
};

export function authReducer(state = initial, action) {
    switch (action.type) {
        case AUTH_LOADING:
            return { ...state, loading: action.payload };
        case AUTH_ERROR:
            return { ...state, error: action.payload };
        case AUTH_SET_TOKEN:
            return { ...state, token: action.payload };
        case AUTH_SET_USER:
            return { ...state, user: action.payload };
        case AUTH_LOGOUT:
            return { loading: false, error: null, token: null, user: null };
        default:
            return state;
    }
}
