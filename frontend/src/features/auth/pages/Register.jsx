// frontend/src/features/auth/pages/Register.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../authActions';

export default function Register() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((s) => s.auth);

    const [form, setForm] = useState({
        login: '',
        full_name: '',
        email: '',
        password: '',
        password_confirmation: '', // имя как на бэке
    });

    // ↓ Этих двух состояний не хватало
    const [localError, setLocalError] = useState('');
    const [ok, setOk] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setOk(false);

        if (form.password !== form.password_confirmation) {
            setLocalError('Passwords do not match');
            return;
        }

        await dispatch(register(form));
        // Если сервер не вернул ошибку — показываем подсказку
        setOk(true);
    };

    return (
        <div className="container auth">
            <h2>Register</h2>
            <form onSubmit={onSubmit} className="form">
                <div className="row">
                    <label>Login</label>
                    <input
                        value={form.login}
                        onChange={(e) =>
                            setForm({ ...form, login: e.target.value })
                        }
                        required
                    />
                </div>

                <div className="row">
                    <label>Full name</label>
                    <input
                        value={form.full_name}
                        onChange={(e) =>
                            setForm({ ...form, full_name: e.target.value })
                        }
                        required
                    />
                </div>

                <div className="row">
                    <label>Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                        required
                    />
                </div>

                <div className="row">
                    <label>Password</label>
                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                        required
                    />
                </div>

                <div className="row">
                    <label>Confirm password</label>
                    <input
                        type="password"
                        value={form.password_confirmation}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                password_confirmation: e.target.value,
                            })
                        }
                        required
                    />
                </div>

                {/* локальная ошибка валидации */}
                {localError && <div className="error">{localError}</div>}
                {/* ошибка от сервера/Thunk */}
                {error && <div className="error">{error}</div>}

                <button className="btn" disabled={loading}>
                    Create account
                </button>
            </form>

            {ok && (
                <div className="notice">
                    Check your email and follow the confirmation link.
                </div>
            )}
        </div>
    );
}
