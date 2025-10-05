// frontend/src/shared/components/Header.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authActions';
import { navigate, onRouteChange } from '../router/helpers';
import { assetUrl } from '../utils/assetUrl';

export default function Header() {
    const dispatch = useDispatch();
    const { user, token } = useSelector((s) => s.auth);
    const [term, setTerm] = useState('');
    const debounceMs = 400;

    // инициализация из URL и подписка на смену маршрута
    useEffect(() => {
        const syncFromUrl = () => {
            const usp = new URLSearchParams(location.search);
            setTerm(usp.get('q') || '');
        };
        syncFromUrl();
        const off = onRouteChange(syncFromUrl);
        return off;
    }, []);

    // авто-обновление URL при вводе (debounce)
    useEffect(() => {
        const h = setTimeout(() => {
            const next = term.trim();
            const usp = new URLSearchParams(location.search);
            const current = usp.get('q') || '';

            // если уже совпадает — лишний navigate не делаем
            if (current === next) return;

            if (next) usp.set('q', next);
            else usp.delete('q');

            navigate(`/${usp.toString() ? `?${usp.toString()}` : ''}`);
        }, debounceMs);

        return () => clearTimeout(h);
    }, [term]);

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            setTerm('');
            const usp = new URLSearchParams(location.search);
            if (usp.has('q')) {
                usp.delete('q');
                navigate(`/${usp.toString() ? `?${usp.toString()}` : ''}`);
            }
        }
    };

    const onLogout = async () => {
        await dispatch(logout());
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="container header__inner">
                <div className="brand" onClick={() => navigate('/')}>
                    USOF
                </div>
                {/* Поиск в хедере (живой, без кнопки) */}
                <div className="header-search">
                    <input
                        type="search"
                        placeholder="Search posts…"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                </div>
                <div className="spacer" />
                {token ? (
                    <div className="userbox">
                        {user?.profile_picture && (
                            <img
                                className="avatar"
                                src={
                                    assetUrl(user.profile_picture) ||
                                    '/placeholder-avatar.png'
                                }
                                alt="avatar"
                            />
                        )}
                        <div className="userbox__info">
                            <div className="userbox__login">{user?.login}</div>
                            <div className="userbox__role">{user?.role}</div>
                        </div>
                        <button className="btn" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="authlinks">
                        <button
                            className="btn"
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>
                        <button
                            className="btn btn--plain"
                            onClick={() => navigate('/register')}
                        >
                            Register
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
