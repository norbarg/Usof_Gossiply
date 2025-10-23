import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authActions';
import { navigate, onRouteChange } from '../router/helpers';
import { assetUrl } from '../utils/assetUrl';

const ICONS = {
    new: '/icons/plus.png',
    edit: '/icons/settings.png',
    admin: '/icons/eye.png',
    logout: '/icons/log-out.png',
};

export default function Header() {
    const dispatch = useDispatch();
    const { user, token } = useSelector((s) => s.auth);

    const [term, setTerm] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false); // NEW
    const menuWrapRef = useRef(null);
    const debounceMs = 400;

    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);
    const userScrolledRef = useRef(false);

    useEffect(() => {
        const scroller = document.querySelector('[data-scroller]') || window;

        const getY = () =>
            scroller === window
                ? window.pageYOffset ||
                  document.documentElement.scrollTop ||
                  document.body.scrollTop ||
                  0
                : scroller.scrollTop;

        const TOP_FREE_SHOW = 60;
        const THRESHOLD = 2;

        let last = getY();
        let ticking = false;

        const apply = () => {
            ticking = false;
            const y = getY();
            const dy = y - last;
            last = y;

            if (y <= TOP_FREE_SHOW) {
                setHidden(false);
                return;
            }
            if (!userScrolledRef.current) {
                return;
            }
            if (dy > THRESHOLD) {
                setHidden(true);
                return;
            }
            if (dy < -THRESHOLD) {
                setHidden(false);
                return;
            }
        };

        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(apply);
            }
        };

        (scroller === window ? window : scroller).addEventListener(
            'scroll',
            onScroll,
            { passive: true }
        );

        const onWheel = (e) => {
            userScrolledRef.current = true;
            if (e.deltaY < 0) setHidden(false);
            else if (getY() > TOP_FREE_SHOW) setHidden(true);
        };
        const onTouchMove = () => {
            userScrolledRef.current = true;
            onScroll();
        };
        const onKey = (e) => {
            if (
                e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'PageUp' ||
                e.key === 'PageDown' ||
                e.key === 'Home' ||
                e.key === 'End' ||
                e.key === ' '
            ) {
                userScrolledRef.current = true;
            }
        };
        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('keydown', onKey);

        return () => {
            (scroller === window ? window : scroller).removeEventListener(
                'scroll',
                onScroll
            );
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('keydown', onKey);
        };
    }, []);
    useEffect(() => {
        try {
            setHidden(false);
            userScrolledRef.current = false;
            const scroller =
                document.querySelector('[data-scroller]') || window;
            const getY = () =>
                scroller === window
                    ? window.pageYOffset ||
                      document.documentElement.scrollTop ||
                      document.body.scrollTop ||
                      0
                    : scroller.scrollTop;
            lastY.current = getY();
            const el = document.querySelector('.site-header');
            if (el) {
                const h = Math.round(
                    el.getBoundingClientRect().height || el.offsetHeight || 0
                );
                if (h) {
                    document.documentElement.style.setProperty(
                        '--header-height',
                        `${h}px`
                    );
                }
            }
        } catch {}
    }, []);

    useEffect(() => {
        const off = onRouteChange(() => {
            setMobileNavOpen(false); // NEW
            setHidden(false);
            userScrolledRef.current = false;
            const scroller =
                document.querySelector('[data-scroller]') || window;
            const y =
                scroller === window
                    ? window.pageYOffset ||
                      document.documentElement.scrollTop ||
                      document.body.scrollTop ||
                      0
                    : scroller.scrollTop;
            lastY.current = y;
        });
        return off;
    }, []);
    useEffect(() => {
        const syncFromUrl = () => {
            const usp = new URLSearchParams(location.search);
            setTerm(usp.get('q') || '');
        };
        syncFromUrl();
        const off = onRouteChange(syncFromUrl);
        return off;
    }, []);

    useEffect(() => {
        const h = setTimeout(() => {
            const next = term.trim();
            const usp = new URLSearchParams(location.search);
            const current = usp.get('q') || '';
            if (current === next) return;
            if (next) usp.set('q', next);
            else usp.delete('q');
            navigate(`/${usp.toString() ? `?${usp.toString()}` : ''}`);
        }, debounceMs);
        return () => clearTimeout(h);
    }, [term]);

    useEffect(() => {
        if (!menuOpen) return;
        const onDoc = (e) => {
            if (
                menuWrapRef.current &&
                !menuWrapRef.current.contains(e.target)
            ) {
                setMenuOpen(false);
            }
        };
        const onEsc = (e) => e.key === 'Escape' && setMenuOpen(false);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onEsc);
        };
    }, [menuOpen]);

    const doLogout = async () => {
        await dispatch(logout());
        setMenuOpen(false);
        try {
            sessionStorage.removeItem('justLoggedIn');
        } catch {}
        try {
            window.history.replaceState({}, '', '/');
        } catch {}
        navigate('/login');
    };

    const go = (path) => {
        setMenuOpen(false);
        setMobileNavOpen(false); // NEW
        navigate(path);
    };

    const path = location.pathname || '/';
    const isPosts = path === '/' || path.startsWith('/posts');
    const isCategories = path.startsWith('/categories');
    const isFavorites = path.startsWith('/favorites');
    return (
        <header
            className={`site-header ${hidden ? 'is-hidden' : 'is-visible'}`}
        >
            <div className="container header__inner">
                {/* Бургер — виден только на мобилках */}
                <button
                    className="hamburger" // NEW
                    aria-label="Open navigation"
                    aria-expanded={mobileNavOpen}
                    aria-controls="mobile-drawer"
                    onClick={() => setMobileNavOpen((v) => !v)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <button
                    className="brand"
                    onClick={() => go('/')}
                    aria-label="Gossiply home"
                >
                    <img className="brand__logo" src="/logo.svg" alt="" />
                    <span className="brand__name">Gossiply</span>
                </button>

                {/* Десктоп-навигация */}
                <nav className="main-nav">
                    <button
                        type="button"
                        className={`nav-a ${isPosts ? 'is-active' : ''}`}
                        onClick={() => go('/')}
                        aria-current={isPosts ? 'page' : undefined}
                    >
                        Posts
                        <span className="nav-a__underline" />
                    </button>

                    <button
                        type="button"
                        className={`nav-a ${isCategories ? 'is-active' : ''}`}
                        onClick={() => go('/categories')}
                        aria-current={isCategories ? 'page' : undefined}
                    >
                        Categories
                        <span className="nav-a__underline" />
                    </button>

                    <button
                        type="button"
                        className={`nav-a ${isFavorites ? 'is-active' : ''}`}
                        onClick={() => go(token ? '/favorites' : '/login')}
                        aria-current={isFavorites ? 'page' : undefined}
                    >
                        Favorite
                        <span className="nav-a__underline" />
                    </button>
                </nav>

                <div className="header-right" ref={menuWrapRef}>
                    {/* Поиск: на мобилке будет компактным, см. CSS */}
                    <div className="header-search--line">
                        <input
                            type="search"
                            placeholder="Search..."
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                        />
                        <span className="header-search__underline" />
                    </div>

                    <div className="header-auth">
                        {token ? (
                            <>
                                <div className="user-label">
                                    <div className="user-label__name">
                                        {user?.login || user?.full_name}
                                    </div>
                                    <div className="user-label__role">
                                        {user?.role}
                                    </div>
                                </div>

                                <button
                                    className="avatar-btn"
                                    onClick={() => setMenuOpen((o) => !o)}
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    title={user?.login || 'Profile'}
                                >
                                    <img
                                        className="avatar"
                                        src={
                                            assetUrl(user?.profile_picture) ||
                                            '/placeholder-avatar.png'
                                        }
                                        alt=""
                                        onError={(e) =>
                                            (e.currentTarget.src =
                                                '/placeholder-avatar.png')
                                        }
                                    />
                                </button>

                                {menuOpen && (
                                    <div className="user-menu" role="menu">
                                        <button
                                            className="user-menu__item"
                                            onClick={() => go('/profile')}
                                        >
                                            <img
                                                className="uicon uicon--avatar"
                                                src={
                                                    assetUrl(
                                                        user?.profile_picture
                                                    ) ||
                                                    '/placeholder-avatar.png'
                                                }
                                                alt=""
                                                onError={(e) =>
                                                    (e.currentTarget.src =
                                                        '/placeholder-avatar.png')
                                                }
                                            />
                                            <span>My profile</span>
                                        </button>

                                        <button
                                            className="user-menu__item"
                                            onClick={() => go('/posts/new')}
                                        >
                                            <img
                                                className="uicon uicon-img"
                                                src={ICONS.new}
                                                alt=""
                                            />
                                            <span>New post</span>
                                        </button>

                                        <button
                                            className="user-menu__item"
                                            onClick={() => go('/profile/edit')}
                                        >
                                            <img
                                                className="uicon uicon-img"
                                                src={ICONS.edit}
                                                alt=""
                                            />
                                            <span>Edit Profile</span>
                                        </button>

                                        {user?.role === 'admin' && (
                                            <button
                                                className="user-menu__item"
                                                onClick={() => go('/admin')}
                                            >
                                                <img
                                                    className="uicon uicon-img"
                                                    src={ICONS.admin}
                                                    alt=""
                                                />
                                                <span>Admin panel</span>
                                            </button>
                                        )}

                                        <hr className="user-menu__sep" />

                                        <button
                                            className="user-menu__item "
                                            onClick={doLogout}
                                        >
                                            <img
                                                className="uicon uicon-img"
                                                src={ICONS.logout}
                                                alt=""
                                            />
                                            <span>Log out</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button
                                className="link-plain"
                                onClick={() => go('/login')}
                            >
                                sign in
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Мобильный выезжающий дроуэр */}
            <div
                id="mobile-drawer"
                className={`mobile-drawer ${mobileNavOpen ? 'is-open' : ''}`} // NEW
                role="dialog"
                aria-modal="true"
            >
                <div className="mobile-drawer__inner">
                    <button
                        className="mobile-drawer__close"
                        aria-label="Close navigation"
                        onClick={() => setMobileNavOpen(false)}
                    >
                        ×
                    </button>

                    <nav className="mobile-nav">
                        <button
                            className={`mnav-a ${isPosts ? 'is-active' : ''}`}
                            onClick={() => go('/')}
                        >
                            Posts
                        </button>
                        <button
                            className={`mnav-a ${
                                isCategories ? 'is-active' : ''
                            }`}
                            onClick={() => go('/categories')}
                        >
                            Categories
                        </button>
                        <button
                            className={`mnav-a ${
                                isFavorites ? 'is-active' : ''
                            }`}
                            onClick={() => go(token ? '/favorites' : '/login')}
                        >
                            Favorite
                        </button>
                    </nav>
                </div>
                <button
                    className="mobile-drawer__backdrop"
                    onClick={() => setMobileNavOpen(false)}
                />
            </div>
        </header>
    );
}
