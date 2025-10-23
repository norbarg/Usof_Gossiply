import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    listPosts,
    toggleLike,
    toggleFavorite,
    loadMyFavoriteIds,
} from '../postsActions';
import PostCard from '../components/PostCard';
import FiltersBar from '../../../shared/components/FiltersBar';
import Paginator from '../../../shared/components/Paginator';
import api from '../../../shared/api/axios';
import { onRouteChange } from '../../../shared/router/helpers';
import '../../../shared/styles/feed.css';
import plusOff from '/icons/plus-circle-off.png';
import plusOn from '/icons/plus-circle-on.png';
import favOff from '/icons/fav_off.png';
import favOn from '/icons/fav_on.png';

const getQFromUrl = () => new URLSearchParams(location.search).get('q') || '';

const getCatsFromUrl = () => {
    const usp = new URLSearchParams(location.search);
    const raw =
        usp.get('category_ids') ||
        usp.get('category_id') ||
        usp.get('cat') ||
        usp.get('category') ||
        '';
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};
const getSortFromUrl = () =>
    new URLSearchParams(location.search).get('sortBy') || 'likes_desc';
const getDateFromUrl = () =>
    new URLSearchParams(location.search).get('date_from') || '';
const getDateToUrl = () =>
    new URLSearchParams(location.search).get('date_to') || '';
const getStatusFromUrl = () =>
    new URLSearchParams(location.search).get('status') || '';

function sameArr(a = [], b = []) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++)
        if (String(a[i]) !== String(b[i])) return false;
    return true;
}

function sameFilters(a, b) {
    return (
        a.q === b.q &&
        a.sortBy === b.sortBy &&
        a.date_from === b.date_from &&
        a.date_to === b.date_to &&
        a.status === b.status &&
        sameArr(a.category_ids, b.category_ids)
    );
}

function getScroller() {
    return (
        document.querySelector('[data-scroller]') || document.documentElement
    );
}
function getScrollTop() {
    const el = getScroller();
    return el.scrollTop || 0;
}
function setScrollTop(y) {
    const el = getScroller();
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: y, left: 0 });
    else el.scrollTop = y;
}

export default function PostList() {
    const dispatch = useDispatch();
    const { items, meta, loading, error } = useSelector((s) => s.posts);
    const [filters, setFilters] = useState({
        category_ids: getCatsFromUrl(),
        q: getQFromUrl(),
        sortBy: getSortFromUrl(),
        date_from: getDateFromUrl(),
        date_to: getDateToUrl(),
        status: getStatusFromUrl(),
    });
    const restoreOnceRef = useRef(false);
    const savedYRef = useRef(null);
    const initialMountRef = useRef(true);

    useEffect(() => {
        const fromState =
            history.state && Number.isFinite(+history.state.feedY)
                ? +history.state.feedY
                : null;
        const raw =
            fromState == null
                ? sessionStorage.getItem('feedScrollY')
                : String(fromState);
        if (raw != null) {
            const y = parseInt(raw, 10);
            if (Number.isFinite(y)) savedYRef.current = y;
        }
    }, []);
    useEffect(() => {
        return () => {
            try {
                const locked = sessionStorage.getItem('feedLock') === '1';
                if (!locked) {
                    const y = getScrollTop();
                    sessionStorage.setItem('feedScrollY', String(y));
                    const st = history.state || {};
                    history.replaceState({ ...st, feedY: y }, '');
                }
            } catch {}
        };
    }, []);

    useEffect(() => {
        const y = savedYRef.current;
        if (restoreOnceRef.current || y == null) return;
        if (loading) return;

        let tries = 0;
        const tryRestore = () => {
            tries += 1;
            const scroller = getScroller();
            const canScroll = scroller.scrollHeight > scroller.clientHeight + 1;
            if (canScroll) setScrollTop(y);
            const now = Math.abs(getScrollTop() - y) <= 2;
            if (now || tries >= 60) {
                restoreOnceRef.current = true;
                savedYRef.current = null;
                try {
                    sessionStorage.removeItem('feedScrollY');
                    sessionStorage.removeItem('feedLock');
                } catch {}
                return;
            }
            requestAnimationFrame(tryRestore);
        };
        requestAnimationFrame(tryRestore);
    }, [loading, items.length]);

    useEffect(() => {
        const off = onRouteChange(() => {
            const q = getQFromUrl();
            const category_ids = getCatsFromUrl();
            const sortBy = getSortFromUrl();
            const date_from = getDateFromUrl();
            const date_to = getDateToUrl();
            const status = getStatusFromUrl();
            setFilters((prev) => {
                const next = {
                    ...prev,
                    q,
                    category_ids,
                    sortBy,
                    date_from,
                    date_to,
                    status,
                };
                return sameFilters(prev, next) ? prev : next;
            });
        });
        return off;
    }, []);

    useEffect(() => {
        const usp = new URLSearchParams();
        if (filters.q) usp.set('q', filters.q);
        if (filters.category_ids?.length)
            usp.set('category_ids', filters.category_ids.join(','));
        if (filters.sortBy) usp.set('sortBy', filters.sortBy);
        if (filters.date_from) usp.set('date_from', filters.date_from);
        if (filters.date_to) usp.set('date_to', filters.date_to);
        if (filters.status) usp.set('status', filters.status);
        const nextUrl =
            location.pathname + (usp.toString() ? `?${usp.toString()}` : '');
        if (nextUrl !== location.pathname + location.search) {
            const st = history.state || {};
            history.replaceState(st, '', nextUrl);
        }
    }, [filters]);

    useEffect(() => {
        dispatch(loadMyFavoriteIds());
    }, [dispatch]);

    useEffect(() => {
        if (initialMountRef.current) {
            initialMountRef.current = false;
            const hasSaved = sessionStorage.getItem('feedScrollY') != null;
            if (hasSaved && (items?.length || 0) > 0) return;
        }
        dispatch(listPosts({ page: 1, limit: 10, ...filters, append: false }));
    }, [dispatch, filters]);

    const [cats, setCats] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/categories');
                setCats(data.items ?? data.results ?? data.data ?? data);
            } catch {}
        })();
    }, []);
    const sentinelRef = useRef(null);
    const limit = meta.limit || 10;
    const total = meta.total || 0;
    const hasMore = items.length < total;

    useEffect(() => {
        if (!sentinelRef.current) return;

        const rootEl = getScroller();
        const io = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry.isIntersecting) return;
                if (loading) return;
                if (!hasMore) return;

                const nextPage = (meta.page || 1) + 1;
                dispatch(
                    listPosts({
                        page: nextPage,
                        limit: limit,
                        ...filters,
                        append: true,
                    })
                );
            },
            {
                root: rootEl === window ? null : rootEl,
                rootMargin: '200px 0px 200px 0px',
            }
        );

        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [dispatch, filters, loading, hasMore, meta.page, limit]);

    return (
        <div className="container">
            <FiltersBar
                value={{
                    categoryIds: (filters.category_ids ?? []).map(String),
                    sortBy: filters.sortBy ?? 'likes_desc',
                    query: filters.q ?? '',
                    dateFrom: filters.date_from ?? '',
                    dateTo: filters.date_to ?? '',
                    status: filters.status ?? '',
                }}
                onChange={(v) =>
                    setFilters({
                        category_ids: Array.isArray(v.categoryIds)
                            ? v.categoryIds
                            : [],
                        sortBy: v.sortBy || 'likes_desc',
                        q: v.query ?? '',
                        date_from: v.dateFrom || '',
                        date_to: v.dateTo || '',
                        status: v.status || '',
                    })
                }
                categories={cats}
                catIconOff={plusOff}
                catIconOn={plusOn}
            />

            {loading && (
                <div className="auth-muted" style={{ marginTop: 12 }}>
                    Loading…
                </div>
            )}
            {error && <div className="auth-error">{error}</div>}

            <div className="post-grid">
                {items.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onToggleLike={(id) => dispatch(toggleLike(id))}
                        onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
                        favIconOff={favOff}
                        favIconOn={favOn}
                    />
                ))}
            </div>

            <div ref={sentinelRef} style={{ height: 1 }} />

            <div
                style={{
                    margin: '12px 0',
                    color: '#9aa3b2',
                    textAlign: 'center',
                }}
            >
                {loading
                    ? 'Loading…'
                    : !hasMore && items.length > 0
                    ? 'That’s all '
                    : ''}
            </div>
        </div>
    );
}
