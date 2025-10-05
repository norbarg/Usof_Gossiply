// frontend/src/app/store.js
import {
    legacy_createStore as createStore, // на случай redux@5
    applyMiddleware,
    combineReducers,
    compose,
} from 'redux';
import { thunk } from 'redux-thunk'; // ← именованный импорт!
import { authReducer } from '../features/auth/authReducer';
import { postsReducer } from '../features/posts/postsReducer';

const rootReducer = combineReducers({
    auth: authReducer,
    posts: postsReducer,
});

const composeEnhancers =
    (typeof window !== 'undefined' &&
        window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
    compose;

export const store = createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk)) // ← используем переменную thunk
);
