// frontend/src/features/auth/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMeFromToken, login, clearError } from '../authActions';
import { navigate } from '../../../shared/router/helpers';

export default function Login() {
    const dispatch = useDispatch();
    const { loading, error, token } = useSelector((s) => s.auth);

    // только два поля
    const [form, setForm] = useState({ identifier: '', password: '' });

    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    useEffect(() => {
        if (token) navigate('/');
    }, [token]);

    // авто-скрытие глобальной ошибки через 3 секунды
    useEffect(() => {
        if (!error) return;
        const t = setTimeout(() => dispatch(clearError()), 3000);
        return () => clearTimeout(t);
    }, [error, dispatch]);

    const onSubmit = async (e) => {
        e.preventDefault();
        const id = form.identifier.trim();
        const payload = id.includes('@')
            ? { email: id, password: form.password }
            : { login: id, password: form.password };
        await dispatch(login(payload));
    };

    // активируем кнопку: оба поля непустые
    const canSubmit = !!form.identifier.trim() && !!form.password && !loading;

    return (
        <div className="auth-card">
            {/* ======= HEADER ======= */}
            <div className="auth-header">
                <img
                    src="/src/assets/logo.png"
                    alt="logo"
                    className="auth-logo-img"
                />
                <div className="auth-header-title inria-serif-bold">Login</div>
                <div />
            </div>

            {/* ======= BODY ======= */}
            <div className="auth-card__body">
                <div className="auth-body3">
                    {/* левая колонка — Back */}
                    <div className="auth-body3__left">
                        <button
                            type="button"
                            className="auth-backline inria-serif-bold"
                            onClick={() => history.back()}
                        >
                            <span className="arrow" /> Back
                        </button>
                    </div>

                    {/* центр — форма */}
                    <form
                        className="auth-form auth-body3__center"
                        onSubmit={onSubmit}
                    >
                        <input
                            className="auth-input inria-serif-regular"
                            placeholder="Login or email..."
                            value={form.identifier}
                            onChange={(e) =>
                                setForm({ ...form, identifier: e.target.value })
                            }
                            required
                        />
                        <input
                            className="auth-input inria-serif-regular"
                            type="password"
                            placeholder="Password..."
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                            required
                        />

                        {/* row: слева Reset, справа кнопка */}
                        <div className="auth-cta">
                            <div className="auth-cta__left">
                                <div className="auth-muted">
                                    Forgot the password?
                                </div>
                                <a
                                    className="auth-arrowlink_reset inria-serif-bold"
                                    onClick={() => navigate('/password-reset')}
                                >
                                    <span className="arrow arrow-grey" /> Reset
                                    password
                                </a>
                            </div>
                            <div className="auth-cta__center_login">
                                {error && (
                                    <div className="auth-error">{error}</div>
                                )}
                            </div>
                            <div className="auth-cta__right">
                                <button
                                    className={`auth-btn inria-serif-bold ${
                                        canSubmit ? 'is-ready' : ''
                                    }`}
                                    disabled={!canSubmit}
                                >
                                    Log in
                                </button>
                            </div>
                        </div>

                        {/* разделитель + ссылка на регистрацию */}
                        <div className="auth-sep">or</div>
                        <div className="auth-muted auth-center inria-serif-bold">
                            New user?{' '}
                            <a
                                className="auth-arrowlink_register inria-serif-bold"
                                onClick={() => navigate('/register')}
                            >
                                <span className="arrow arrow-grey" /> Sign up
                            </a>
                        </div>
                    </form>

                    {/* правый спейсер */}
                    <div className="auth-body3__right" />
                </div>
            </div>
        </div>
    );
}
