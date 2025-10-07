// frontend/src/app/App.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from '../shared/components/Header';
import RouterView from './routes';
import { fetchMeFromToken } from '../features/auth/authActions';
import { onRouteChange } from '../shared/router/helpers';
import AuthBackground from '../shared/components/AuthBackground';
import DarkVeil from '../shared/components/DarkVeil';
import '../shared/styles/DarkVeil.css';
import '../shared/styles/auth.css';

// теперь работаем с history API → проверяем именно pathname
function isAuthPath(pathname) {
    return /^\/(login|register|password-reset)(\/.*)?$/.test(pathname || '/');
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
            {/* ФИКСИРОВАННЫЙ ФОН ПОД ВСЕМ UI */}
            <div className="bg-veilshell" aria-hidden>
                <DarkVeil
                    hueShift={-12}
                    noiseIntensity={0.035}
                    scanlineIntensity={0.18}
                    scanlineFrequency={0.06}
                    speed={0.55}
                    warpAmount={0.1}
                    resolutionScale={1} // можно 0.75–1.0 для баланса FPS/чёткости
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
        </>
    );
}
