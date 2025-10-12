// frontend/src/app/routes.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { onRouteChange, parsePath, matchPath } from '../shared/router/helpers';
import Login from '../features/auth/pages/Login.jsx';
import Register from '../features/auth/pages/Register.jsx';
import ResetPassword from '../features/auth/pages/ResetPassword.jsx';
import PostList from '../features/posts/pages/PostList.jsx';
import PostDetails from '../features/posts/pages/PostDetails.jsx';
import CategoriesList from '../features/categories/pages/CategoriesList';
import FavoritesList from '../features/favorites/pages/FavoritesList.jsx';
import Profile from '../features/profile/pages/Profile.jsx';
import ProfileEdit from '../features/profile/pages/ProfileEdit.jsx';
import PostNew from '../features/posts/pages/PostNew.jsx';
import PostEdit from '../features/posts/pages/PostEdit.jsx';

const routes = [
    { path: '/', component: PostList },
    { path: '/posts/new', component: PostNew },
    { path: '/posts/:id', component: PostDetails },
    { path: '/categories', component: CategoriesList },
    { path: '/favorites', component: FavoritesList },
    { path: '/posts/:id/edit', component: PostEdit },
    { path: '/profile', component: Profile },
    { path: '/profile/edit', component: ProfileEdit },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/password-reset', component: ResetPassword },
];

export default function RouterView() {
    const [path, setPath] = useState(parsePath());
    useEffect(() => onRouteChange(() => setPath(parsePath())), []);

    const { Component, params } = useMemo(() => {
        for (const r of routes) {
            const params = matchPath(r.path, path);
            if (params) return { Component: r.component, params };
        }
        return {
            Component: () => <div className="container">Not found</div>,
            params: {},
        };
    }, [path]);

    return <Component params={params} />;
}
