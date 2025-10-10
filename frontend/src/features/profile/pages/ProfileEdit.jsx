import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { navigate } from '../../../shared/router/helpers';
import api from '../../../shared/api/axios';
import { setUser, logout } from '../../auth/authActions';
import { assetUrl } from '../../../shared/utils/assetUrl';
import uploadIconUrl from '/icons/upload.png';
import '../../../shared/styles/profile.css';

export default function ProfileEdit() {
    const dispatch = useDispatch();
    const { token, user } = useSelector((s) => s.auth);

    const [fullName, setFullName] = useState('');
    const [login, setLogin] = useState('');

    const [avatarUrl, setAvatarUrl] = useState('/placeholder-avatar.png');
    const [avatarFile, setAvatarFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginTaken, setLoginTaken] = useState(false);

    // danger zone
    const [showDanger, setShowDanger] = useState(false);
    const [confirmLogin, setConfirmLogin] = useState('');
    const confirmOk = useMemo(
        () => confirmLogin.trim() === (user?.login || ''),
        [confirmLogin, user?.login]
    );

    useEffect(() => {
        if (!token) navigate('/login');
    }, [token]);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const { data } = await api.get(`/users/${user.id}`);
                dispatch(setUser(data));
                setFullName(data.full_name || '');
                setLogin(data.login || '');
                setAvatarUrl(
                    assetUrl(data.profile_picture) || '/placeholder-avatar.png'
                );
            } catch {}
        })();
    }, [user?.id, dispatch]);

    // блокируем скролл под модалкой
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    const onPickAvatar = (e) => {
        const f = e.target.files?.[0] || null;
        setAvatarFile(f);
        if (f) setAvatarUrl(URL.createObjectURL(f));
    };

    const loginOk = useMemo(
        () => /^[a-zA-Z0-9_.]{3,20}$/.test(login.trim()),
        [login]
    );
    const nameOk = useMemo(() => fullName.trim().length >= 2, [fullName]);
    const valid = loginOk && nameOk;

    const onSave = async () => {
        if (!valid || loading) return;
        setLoading(true);
        setError('');
        setLoginTaken(false);
        try {
            if (avatarFile) {
                const fd = new FormData();
                fd.append('avatar', avatarFile);
                await api.patch('/users/avatar', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            // Роль НЕ отправляем вообще
            const body = { full_name: fullName.trim(), login: login.trim() };
            await api.patch(`/users/${user.id}`, body);

            const { data: fresh } = await api.get(`/users/${user.id}`);
            dispatch(setUser(fresh));
            navigate('/profile');
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.error || String(e);
            if (status === 409) {
                setLoginTaken(true);
                setError('This login is already taken.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const onDeleteAccount = async () => {
        if (!user?.id || loading) return;
        setError('');
        try {
            await api.delete(`/users/${user.id}`);
            await dispatch(logout());
            try {
                sessionStorage.removeItem('justLoggedIn');
            } catch {}
            try {
                window.history.replaceState({}, '', '/');
            } catch {}
            navigate('/login');
        } catch (e) {
            setError(e?.response?.data?.error || 'Failed to delete account');
        }
    };

    // закрытие по клику вне карточки
    const onVeilClick = useCallback((e) => {
        if (e.target === e.currentTarget) navigate(-1);
    }, []);

    return (
        <div className="compose-veil" onClick={onVeilClick}>
            <section
                className="compose-card"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="compose-head">
                    <h2 className="compose-title inria-serif-bold">
                        Edit profile
                    </h2>
                </header>

                <div className="compose-body">
                    {error && (
                        <div
                            className="auth-error"
                            style={{ marginBottom: 10 }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="edit-grid">
                        {/* Аватар и загрузка */}
                        <div className="avatar-col">
                            <div className="avatar-box">
                                <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    className="avatar-img"
                                    onError={(e) =>
                                        (e.currentTarget.src =
                                            '/placeholder-avatar.png')
                                    }
                                />
                            </div>

                            <label
                                className="file-btn -icon"
                                title="Upload new avatar"
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={onPickAvatar}
                                />
                                <img
                                    className="ico"
                                    src={uploadIconUrl}
                                    alt=""
                                />
                                <span className="inria-serif-regular">
                                    Upload avatar
                                </span>
                            </label>

                            {avatarFile && (
                                <button
                                    className="btn ghost sm"
                                    style={{ marginTop: 8 }}
                                    onClick={() => {
                                        setAvatarFile(null);
                                        setAvatarUrl(
                                            assetUrl(user?.profile_picture) ||
                                                '/placeholder-avatar.png'
                                        );
                                    }}
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        {/* Поля */}
                        <div className="fields-col">
                            <label className="f-field">
                                <span className="f-label">Full name</span>
                                <input
                                    className="f-input"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    placeholder="Your full name"
                                    maxLength={120}
                                />
                                <span className="f-hint">
                                    {fullName.trim().length}/120
                                </span>
                            </label>

                            <label className="f-field">
                                <span className="f-label">Login</span>
                                <input
                                    className="f-input"
                                    value={login}
                                    onChange={(e) => {
                                        setLogin(e.target.value);
                                        setLoginTaken(false);
                                    }}
                                    placeholder="username"
                                    maxLength={20}
                                />
                                {!loginOk && login && (
                                    <span
                                        className="auth-error"
                                        style={{ marginTop: 6 }}
                                    >
                                        3–20 symbols: letters, digits, _ or .
                                    </span>
                                )}
                                {loginTaken && (
                                    <span
                                        className="auth-error"
                                        style={{ marginTop: 6 }}
                                    >
                                        This login is already taken.
                                    </span>
                                )}
                            </label>

                            {/* Роль показываем только read-only */}
                            <label className="f-field">
                                <span className="f-label">Role</span>
                                <div className="f-readonly">
                                    {user?.role || 'user'}
                                </div>
                            </label>

                            <div
                                className="compose-footer single"
                                style={{ marginTop: 8 }}
                            >
                                <div className="grow" />
                                <button
                                    className="publish-btn inria-serif-bold"
                                    onClick={onSave}
                                    disabled={!valid || loading}
                                >
                                    {loading ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger zone */}
                    <div className="danger-zone">
                        <h3 className="inria-serif-bold">Danger zone</h3>
                        {!showDanger ? (
                            <button
                                className="danger-cta inria-serif-bold"
                                onClick={() => setShowDanger(true)}
                            >
                                Delete account
                            </button>
                        ) : (
                            <div className="danger-box">
                                <div
                                    className="auth-error"
                                    style={{ marginBottom: 8 }}
                                >
                                    This action is irreversible. All your data
                                    may be removed.
                                </div>
                                <label className="f-field">
                                    <span className="f-label">
                                        Type your login to confirm (
                                        {user?.login})
                                    </span>
                                    <input
                                        className="f-input"
                                        value={confirmLogin}
                                        onChange={(e) =>
                                            setConfirmLogin(e.target.value)
                                        }
                                        placeholder={user?.login}
                                    />
                                </label>
                                <div className="f-row" style={{ marginTop: 8 }}>
                                    <button
                                        className="publish-btn inria-serif-bold"
                                        onClick={() => {
                                            setShowDanger(false);
                                            setConfirmLogin('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <div className="grow" />
                                    <button
                                        className="danger-cta inria-serif-bold"
                                        onClick={onDeleteAccount}
                                        disabled={!confirmOk}
                                    >
                                        {loading
                                            ? 'Deleting…'
                                            : 'Yes, delete my account'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
