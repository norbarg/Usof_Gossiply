//frontend/src/features/auth/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMeFromToken, login } from '../authActions';
import { navigate } from '../../../shared/router/helpers';

export default function Login() {
    const dispatch = useDispatch();
    const { loading, error, token } = useSelector((s) => s.auth);
    const [form, setForm] = useState({ login: '', email: '', password: '' });

    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    useEffect(() => {
        if (token) navigate('/');
    }, [token]);

    const onSubmit = async (e) => {
        e.preventDefault();
        await dispatch(login(form));
    };

    return (
        <div className="container auth">
            <h2>Login</h2>
            <form onSubmit={onSubmit} className="form">
                <div className="row">
                    <label>Login (or leave empty to use Email)</label>
                    <input
                        value={form.login}
                        onChange={(e) =>
                            setForm({ ...form, login: e.target.value })
                        }
                    />
                </div>
                <div className="row">
                    <label>Email (or leave empty to use Login)</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
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
                {error && <div className="error">{error}</div>}
                <button className="btn" disabled={loading}>
                    Sign in
                </button>
            </form>
            <div className="muted">
                <a href="#/password-reset">Forgot password?</a>
            </div>
        </div>
    );
}
