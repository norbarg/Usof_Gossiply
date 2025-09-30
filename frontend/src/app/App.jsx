import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Header from '../shared/components/Header';
import RouterView from './routes';
import { fetchMeFromToken } from '../features/auth/authActions';

export default function App() {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(fetchMeFromToken());
    }, [dispatch]);
    return (
        <>
            <Header />
            <main>
                <RouterView />
            </main>
        </>
    );
}
