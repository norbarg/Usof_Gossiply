import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from '../shared/components/Header';
import RouterView from './routes';
import { fetchMeFromToken } from '../features/auth/authActions';
import { onRouteChange, parsePath } from '../shared/router/helpers';
import AuthBackground from '../shared/components/AuthBackground';
import '../shared/styles/auth.css'; // общий стиль для auth-страниц

function isAuthPath(hash) {
    const h = (hash || '').replace(/^#/, '');
    return /^\/(login|register|password-reset)(|\/.*)$/.test(h || '/');
}

export default function App() {
    const dispatch = useDispatch();
    const [path, setPath] = useState(location.pathname);

    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    useEffect(() => onRouteChange(() => setPath(location.pathname)), []);

    const hideHeader = isAuthPath(path);

    return (
        <>
            {!hideHeader && <Header />}
            {hideHeader && <AuthBackground />}
            <main className={hideHeader ? 'auth-main' : ''}>
                <RouterView />
            </main>
        </>
    );
}
