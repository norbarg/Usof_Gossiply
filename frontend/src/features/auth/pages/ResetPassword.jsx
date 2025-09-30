// frontend/src/features/auth/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { confirmPasswordReset, requestPasswordReset } from '../authActions';

export default function ResetPassword() {
    const dispatch = useDispatch();
    const { loading, error } = useSelector((s) => s.auth);
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPass, setNewPass] = useState('');
    const [info, setInfo] = useState('');

    const askToken = async (e) => {
        e.preventDefault();
        setInfo('');
        try {
            await dispatch(requestPasswordReset(email));
            setInfo(
                'Если этот email существует, мы отправили на него токен. Проверь почту (и папку Спам).'
            );
        } catch (_) {}
    };

    const doReset = async (e) => {
        e.preventDefault();
        await dispatch(confirmPasswordReset({ token, new_password: newPass }));
        alert('Password updated. Now login.');
        location.hash = '#/login';
    };

    return (
        <div className="container auth">
            <h2>Password reset</h2>

            <form className="form" onSubmit={askToken}>
                <div className="row">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button className="btn" disabled={loading}>
                    Send reset token to email
                </button>
            </form>

            {info && (
                <div className="notice" style={{ marginTop: 10 }}>
                    {info}
                </div>
            )}

            <hr />

            <form className="form" onSubmit={doReset}>
                <div className="row">
                    <label>Reset token (from email)</label>
                    <input
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        required
                    />
                </div>
                <div className="row">
                    <label>New password</label>
                    <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        required
                    />
                </div>
                {error && <div className="error">{error}</div>}
                <button className="btn" disabled={loading}>
                    Set new password
                </button>
            </form>
        </div>
    );
}
