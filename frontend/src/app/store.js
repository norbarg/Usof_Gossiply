import {
    legacy_createStore as createStore,
    applyMiddleware,
    combineReducers,
    compose,
} from 'redux';
import { thunk } from 'redux-thunk';
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
    composeEnhancers(applyMiddleware(thunk))
);
