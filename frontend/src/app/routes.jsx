import React, { useEffect, useMemo, useState } from 'react';
import { onRouteChange, parsePath, matchPath } from '../shared/router/helpers';
import Login from '../features/auth/pages/Login.jsx';
import Register from '../features/auth/pages/Register.jsx';
import ResetPassword from '../features/auth/pages/ResetPassword.jsx';

function Home() {
    return (
        <div className="container">
            <h2>Home</h2>
            <p>Тут будуть пости (наступний крок).</p>
        </div>
    );
}

const routes = [
    { path: '/', component: Home },
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
