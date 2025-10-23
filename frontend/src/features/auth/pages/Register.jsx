import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../authActions';
import { navigate } from '../../../shared/router/helpers';

export default function Register() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((s) => s.auth);
    const [ok, setOk] = useState(false);
    const [localError, setLocalError] = useState('');
    const [form, setForm] = useState({
        login: '',
        full_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (!error) return;
        const t = setTimeout(() => dispatch(clearError()), 3000);
        return () => clearTimeout(t);
    }, [error, dispatch]);

    useEffect(() => {
        if (!localError) return;
        const t = setTimeout(() => setLocalError(''), 3000);
        return () => clearTimeout(t);
    }, [localError]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setOk(false);
        if (form.password !== form.password_confirmation) {
            setLocalError('Passwords do not match');
            return;
        }
        await dispatch(register(form));
        setOk(true);
    };
    const allFilled = Object.values(form).every(
        (v) => String(v).trim().length > 0
    );
    const canSubmit = allFilled && !loading;

    return (
        <div className="auth-card">
            <div className="auth-header">
                <img
                    src="/src/assets/logo.png"
                    alt="logo"
                    className="auth-logo-img"
                />
                <div className="auth-header-title inria-serif-bold">
                    Register
                </div>
                <div />
            </div>

            <div className="auth-card__body">
                <div className="auth-body3">
                    <div className="auth-body3__left">
                        <button
                            type="button"
                            className="auth-backline inria-serif-bold"
                            onClick={() => history.back()}
                        >
                            <span className="arrow " /> Back
                        </button>
                    </div>

                    <form className="auth-form  " onSubmit={onSubmit}>
                        <input
                            className="auth-input inria-serif-regular"
                            placeholder="Enter login..."
                            value={form.login}
                            onChange={(e) =>
                                setForm({ ...form, login: e.target.value })
                            }
                            required
                        />
                        <input
                            className="auth-input inria-serif-regular"
                            placeholder="Full name..."
                            value={form.full_name}
                            onChange={(e) =>
                                setForm({ ...form, full_name: e.target.value })
                            }
                            required
                        />
                        <input
                            className="auth-input inria-serif-regular"
                            type="email"
                            placeholder="Email..."
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
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
                        <input
                            className="auth-input inria-serif-regular"
                            type="password"
                            placeholder="Confirm password..."
                            value={form.password_confirmation}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    password_confirmation: e.target.value,
                                })
                            }
                            required
                        />

                        <div className="auth-cta">
                            <div className="auth-cta__left">
                                <div className="auth-muted">
                                    Already have account?
                                </div>
                                <a
                                    className="auth-arrowlink inria-serif-bold"
                                    onClick={() => navigate('/login')}
                                >
                                    <span className="arrow arrow-grey" /> Log in
                                </a>
                            </div>
                            <div className="auth-cta__center">
                                {localError && (
                                    <div className="auth-error">
                                        {localError}
                                    </div>
                                )}
                                {error && (
                                    <div className="auth-error">{error}</div>
                                )}
                                {ok && (
                                    <div className="auth-notice">
                                        Check your email and follow the
                                        confirmation link.
                                    </div>
                                )}
                            </div>
                            <div className="auth-cta__right">
                                <button
                                    className={`auth-btn inria-serif-bold ${
                                        canSubmit ? 'is-ready' : ''
                                    }`}
                                    disabled={!canSubmit}
                                >
                                    Sign up
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="auth-body3__right" />
                </div>
            </div>
        </div>
    );
}
