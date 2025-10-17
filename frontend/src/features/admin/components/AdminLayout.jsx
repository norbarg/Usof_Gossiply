import React from 'react';
import { navigate } from '../../../shared/router/helpers';

export default function AdminLayout({ children }) {
    const section = location.pathname.split('/')[2] || '';
    const go = (p) => navigate(`/admin${p}`);

    return (
        <div className="admin-shell">
            <aside className="admin-aside">
                <div className="admin-brand" onClick={() => go('')}>
                    <img src="/logo.svg" alt="" className="admin-brand__logo" />
                    <span className="admin-brand__name">Admin</span>
                </div>

                <nav className="admin-nav">
                    <button
                        className={`admin-nav__a ${
                            !section ? 'is-active' : ''
                        }`}
                        onClick={() => go('')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`admin-nav__a ${
                            section === 'users' ? 'is-active' : ''
                        }`}
                        onClick={() => go('/users')}
                    >
                        Users
                    </button>
                    <button
                        className={`admin-nav__a ${
                            section === 'posts' ? 'is-active' : ''
                        }`}
                        onClick={() => go('/posts')}
                    >
                        Posts
                    </button>
                    <button
                        className={`admin-nav__a ${
                            section === 'comments' ? 'is-active' : ''
                        }`}
                        onClick={() => go('/comments')}
                    >
                        Comments
                    </button>
                    <button
                        className={`admin-nav__a ${
                            section === 'categories' ? 'is-active' : ''
                        }`}
                        onClick={() => go('/categories')}
                    >
                        Categories
                    </button>
                </nav>
            </aside>

            {/* единственный скроллер */}
            <main className="admin-main" data-scroller>
                <div className="admin-topbar">
                    <button
                        className="back-btn"
                        onClick={() => navigate('/')}
                        title="Back to app"
                    >
                        ← Back to app
                    </button>
                </div>

                {children}
            </main>
        </div>
    );
}
