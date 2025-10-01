import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from '../shared/components/Header';
import RouterView from './routes';
import { fetchMeFromToken } from '../features/auth/authActions';
import { onRouteChange, parseHash } from '../shared/router/helpers';
import AuthBackground from '../shared/components/AuthBackground';
import '../shared/styles/auth.css'; // общий стиль для auth-страниц

function isAuthPath(hash) {
    const h = (hash || '').replace(/^#/, '');
    return /^\/(login|register|password-reset)(|\/.*)$/.test(h || '/');
}

export default function App() {
    const dispatch = useDispatch();
    const [hash, setHash] = useState(location.hash);

    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    useEffect(() => onRouteChange(() => setHash(location.hash)), []);

    const hideHeader = isAuthPath(hash);

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
