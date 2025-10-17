// frontend/src/features/admin/AdminApp.jsx
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { navigate, matchPath, parsePath } from '../../shared/router/helpers';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import PostsPage from './pages/PostsPage';
import CommentsPage from './pages/CommentsPage';
import CategoriesPage from './pages/CategoriesPage';
import '../../shared/styles/admin.css';

export default function AdminApp() {
    const { user, token } = useSelector((s) => s.auth);

    // ✅ Гвард без ложных редиректов при перезагрузке
    useEffect(() => {
        // если вообще нет токена — уводим на логин
        if (!token) {
            navigate('/login');
            return;
        }
        // если токен есть, но user ещё не подгружен — ждём
        if (!user) return;

        // когда user известен и это не админ — уводим на главную
        if (String(user.role) !== 'admin') {
            navigate('/');
        }
    }, [token, user]);

    // во весь экран
    useEffect(() => {
        const html = document.documentElement;
        const prevOverflow = document.body.style.overflow;
        html.classList.add('admin-fullscreen');
        document.body.style.overflow = 'hidden';
        return () => {
            html.classList.remove('admin-fullscreen');
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    const path = parsePath();
    const mUsers = matchPath('/admin/users', path);
    const mPosts = matchPath('/admin/posts', path);
    const mComments = matchPath('/admin/comments', path);
    const mCats = matchPath('/admin/categories', path);

    let content = <Dashboard />;
    if (mUsers) content = <UsersPage />;
    else if (mPosts) content = <PostsPage />;
    else if (mComments) content = <CommentsPage />;
    else if (mCats) content = <CategoriesPage />;

    return <AdminLayout>{content}</AdminLayout>;
}
