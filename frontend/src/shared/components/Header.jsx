import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authActions';
import { navigate } from '../router/helpers';
import { mediaUrl } from '../utils/jwt';

export default function Header() {
    const dispatch = useDispatch();
    const { user, token } = useSelector((s) => s.auth);

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
                <div className="spacer" />
                {token ? (
                    <div className="userbox">
                        {user?.profile_picture && (
                            <img
                                className="avatar"
                                src={mediaUrl(user.profile_picture)}
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
