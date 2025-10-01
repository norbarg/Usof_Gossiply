import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    confirmPasswordReset,
    requestPasswordReset,
    clearError,
} from '../authActions';
import { navigate } from '../../../shared/router/helpers';

export default function ResetPassword() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((s) => s.auth);

    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPass, setNewPass] = useState('');
    const [info, setInfo] = useState('');

    // >>> авто-скрытие глобальной ошибки через 3с
    useEffect(() => {
        if (!error) return;
        const t = setTimeout(() => dispatch(clearError()), 3000);
        return () => clearTimeout(t);
    }, [error, dispatch]);

    // >>> авто-скрытие локального инфо через 3с
    useEffect(() => {
        if (!info) return;
        const t = setTimeout(() => setInfo(''), 3000);
        return () => clearTimeout(t);
    }, [info]);

    const canAsk = !!email.trim() && !loading;
    const canReset = !!token.trim() && !!newPass && !loading;

    const askToken = async (e) => {
        e.preventDefault();
        setInfo('');
        try {
            await dispatch(requestPasswordReset(email.trim()));
            setInfo('We sent a token to it. Check your email and spam.');
        } catch (_) {}
    };

    const doReset = async (e) => {
        e.preventDefault();
        await dispatch(
            confirmPasswordReset({ token: token.trim(), new_password: newPass })
        );
        navigate('/login');
    };

    return (
        <div className="auth-card">
            {/* HEADER */}
            <div className="auth-header">
                <img
                    src="/src/shared/assets/logo.png"
                    alt="logo"
                    className="auth-logo-img"
                />
                <div className="auth-header-title inria-serif-bold">
                    Password reset
                </div>
                <div />
            </div>

            {/* BODY */}
            <div className="auth-card__body">
                <div className="auth-body3">
                    {/* Back слева */}
                    <div className="auth-body3__left">
                        <button
                            type="button"
                            className="auth-backline inria-serif-bold"
                            onClick={() => history.back()}
                        >
                            <span className="arrow" /> Back
                        </button>
                    </div>

                    {/* Центр */}
                    <div className="auth-body3__center">
                        {/* Запросить токен */}
                        <form className="auth-form" onSubmit={askToken}>
                            <input
                                className="auth-input inria-serif-regular"
                                type="email"
                                placeholder="Email..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <div className="auth-cta reset">
                                <div className="auth-cta__left">
                                    <div className="auth-muted">
                                        We will send the token to the specified
                                        email.
                                    </div>
                                </div>

                                <div className="auth-cta__right">
                                    <button
                                        className={`auth-btn inria-serif-bold ${
                                            canAsk ? 'is-ready' : ''
                                        }`}
                                        disabled={!canAsk}
                                    >
                                        Request reset token
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Разделитель */}
                        <hr className="auth-sep-line" />

                        {/* Ввести токен и новый пароль */}
                        <form className="auth-form" onSubmit={doReset}>
                            <input
                                className="auth-input inria-serif-regular"
                                placeholder="Reset token..."
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                            />
                            <input
                                className="auth-input inria-serif-regular"
                                type="password"
                                placeholder="New password..."
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                required
                            />

                            <div className="auth-cta reset">
                                <div className="auth-cta__left">
                                    {' '}
                                    {error && (
                                        <div className="auth-error">
                                            {error}
                                        </div>
                                    )}
                                    {info && (
                                        <div className="auth-notice">
                                            {info}
                                        </div>
                                    )}
                                </div>
                                <div className="auth-cta__right">
                                    <button
                                        className={`auth-btn inria-serif-bold ${
                                            canReset ? 'is-ready' : ''
                                        }`}
                                        disabled={!canReset}
                                    >
                                        Set new password
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Правый спейсер */}
                    <div className="auth-body3__right" />
                </div>
            </div>
        </div>
    );
}
