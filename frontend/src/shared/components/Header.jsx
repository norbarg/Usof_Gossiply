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

        const TOP_FREE_SHOW = 60; // всегда показывать, если почти у верха
        const THRESHOLD = 2; // антидребезг

        let last = getY();
        let ticking = false;

        const apply = () => {
            ticking = false;
            const y = getY();
            const dy = y - last;
            last = y;

            if (y <= TOP_FREE_SHOW) {
                // почти у верха — показываем
                setHidden(false);
                return;
            }
            // Пока не было явного пользовательского ввода,
            // игнорируем программные смещения (восстановление скролла, лэйаут и т.п.)
            if (!userScrolledRef.current) {
                return;
            }
            if (dy > THRESHOLD) {
                // вниз — прячем
                setHidden(true);
                return;
            }
            if (dy < -THRESHOLD) {
                // вверх — показываем
                setHidden(false);
                return;
            }
            // мелкие колебания игнорим
        };

        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(apply);
            }
        };

        // основной слушатель — на реальном скроллере
        (scroller === window ? window : scroller).addEventListener(
            'scroll',
            onScroll,
            { passive: true }
        );

        // фоллбеки — помогают, если скроллит вложенный элемент
        const onWheel = (e) => {
            userScrolledRef.current = true;
            if (e.deltaY < 0) setHidden(false); // вверх колёсиком — показать
            else if (getY() > TOP_FREE_SHOW) setHidden(true);
        };
        const onTouchMove = () => {
            userScrolledRef.current = true;
            onScroll();
        };
        const onKey = (e) => {
            // клавиши прокрутки
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
    // При маунте: показать хедер, обновить baseline скролла, проставить реальную высоту в CSS var
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

            // Замеряем фактическую высоту шапки → кладём в --header-height
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

    // На смену роутов — всегда раскрывать и сбрасывать baseline, чтобы не «подпрыгивал»
    useEffect(() => {
        const off = onRouteChange(() => {
            setHidden(false);
            userScrolledRef.current = false;
            // обновим базовую точку
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
    // sync из URL + подписка
    useEffect(() => {
        const syncFromUrl = () => {
            const usp = new URLSearchParams(location.search);
            setTerm(usp.get('q') || '');
        };
        syncFromUrl();
        const off = onRouteChange(syncFromUrl);
        return off;
    }, []);

    // живой поиск (?q=...)
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

    // закрытие поповера по клику-вне и по Esc
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
        // на всякий — уберём флаг приветствия
        try {
            sessionStorage.removeItem('justLoggedIn');
        } catch {}
        // перезапишем текущую запись истории на главную
        try {
            window.history.replaceState({}, '', '/');
        } catch {}
        // и добавим /login как новую запись (чтобы внутри auth back работал)
        navigate('/login'); // важно: push, не replace
    };

    const go = (path) => {
        setMenuOpen(false);
        navigate(path);
    };

    // active
    const path = location.pathname || '/';
    const isPosts = path === '/' || path.startsWith('/posts');
    const isCategories = path.startsWith('/categories');
    const isFavorites = path.startsWith('/favorites');
    return (
        <header
            className={`site-header ${hidden ? 'is-hidden' : 'is-visible'}`}
        >
            <div className="container header__inner">
                {/* ЛОГО + Нейминг */}
                <button
                    className="brand"
                    onClick={() => navigate('/')}
                    aria-label="Gossiply home"
                >
                    {/* положи /logo.svg в public; временно можно заменить любой svg/png */}
                    <img className="brand__logo" src="/logo.svg" alt="" />
                    <span className="brand__name">Gossiply</span>
                </button>

                {/* NAV */}
                <nav className="main-nav">
                    <button
                        type="button"
                        className={`nav-a ${isPosts ? 'is-active' : ''}`}
                        onClick={() => navigate('/')}
                        aria-current={isPosts ? 'page' : undefined}
                    >
                        Posts
                        <span className="nav-a__underline" />
                    </button>

                    <button
                        type="button"
                        className={`nav-a ${isCategories ? 'is-active' : ''}`}
                        onClick={() => navigate('/categories')}
                        aria-current={isCategories ? 'page' : undefined}
                    >
                        Categories
                        <span className="nav-a__underline" />
                    </button>

                    <button
                        type="button"
                        className={`nav-a ${isFavorites ? 'is-active' : ''}`}
                        onClick={() =>
                            navigate(token ? '/favorites' : '/login')
                        }
                        aria-current={isFavorites ? 'page' : undefined}
                    >
                        Favorite
                        <span className="nav-a__underline" />
                    </button>
                </nav>

                {/* ПОИСК + АВАТАР */}
                <div className="header-right" ref={menuWrapRef}>
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
                                {/* имя + роль — между поиском и аватаркой */}
                                <div className="user-label">
                                    <div className="user-label__name">
                                        {user?.login || user?.full_name}
                                    </div>
                                    <div className="user-label__role">
                                        {user?.role}
                                    </div>
                                </div>

                                {/* аватарка — кнопка, открывает поповер */}
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
                                            {/* мини-аватар именно в пункте "My profile" */}
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
                                onClick={() => navigate('/login')}
                            >
                                sign in
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
