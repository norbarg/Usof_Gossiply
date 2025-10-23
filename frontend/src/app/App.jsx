import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../shared/components/Header';
import RouterView from './routes';
import { fetchMeFromToken } from '../features/auth/authActions';
import { onRouteChange } from '../shared/router/helpers';
import AuthBackground from '../shared/components/AuthBackground';
import DarkVeil from '../shared/components/DarkVeil';
import WelcomeOverlay from '../shared/components/WelcomeOverlay';
import { AnimatePresence } from 'motion/react';
import AdminApp from '../features/admin/AdminApp';
import '../shared/styles/DarkVeil.css';
import '../shared/styles/auth.css';

function isAuthPath(pathname) {
    return /^\/(login|register|password-reset)(\/.*)?$/.test(pathname || '/');
}

export default function App() {
    const dispatch = useDispatch();
    const [path, setPath] = useState(location.pathname);
    const { user } = useSelector((s) => s.auth);
    const prevUserRef = useRef(null);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    useEffect(() => onRouteChange(() => setPath(location.pathname)), []);

    useEffect(() => {
        const prev = prevUserRef.current;
        const just = sessionStorage.getItem('justLoggedIn') === '1';
        if (!prev && user && just) {
            setShowWelcome(true);
            sessionStorage.removeItem('justLoggedIn');
        }
        prevUserRef.current = user;
    }, [user]);

    if (path === '/admin' || path.startsWith('/admin/')) {
        return <AdminApp />;
    }

    const hideHeader = isAuthPath(path);

    return (
        <>
            <div className="bg-veilshell" aria-hidden>
                <DarkVeil
                    hueShift={-12}
                    noiseIntensity={0.035}
                    scanlineIntensity={0.18}
                    scanlineFrequency={0.06}
                    speed={0.55}
                    warpAmount={0.1}
                    resolutionScale={1}
                />
            </div>
            {!hideHeader && <Header />}
            {hideHeader && <AuthBackground />}
            <main
                className={`page ${hideHeader ? 'auth-main' : ''}`}
                data-scroller
            >
                <RouterView />
            </main>

            <AnimatePresence>
                {showWelcome && (
                    <WelcomeOverlay
                        visible
                        text="Welcome to Gossiply"
                        onDone={() => setShowWelcome(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
