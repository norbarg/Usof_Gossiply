import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPost, toggleLike, toggleFavorite } from '../postsActions';
import { matchPath, parsePath, navigate } from '../../../shared/router/helpers';
import { formatDate } from '../../../shared/utils/format';

export default function PostDetails() {
    const dispatch = useDispatch();
    const { current: post, loading, error } = useSelector((s) => s.posts);

    useEffect(() => {
        const path = parsePath();
        const params = matchPath('/posts/:id', path);
        if (params?.id) dispatch(fetchPost(params.id));
    }, [dispatch]);

    if (loading && !post) return <div className="container">Loading…</div>;
    if (error) return <div className="container auth-error">{error}</div>;
    if (!post) return null;

    return (
        <div className="container">
            <button className="auth-backline" onClick={() => history.back()}>
                <span className="arrow" /> Back
            </button>

            <h2 className="inria-serif-bold" style={{ margin: '8px 0 4px' }}>
                {post.title}
            </h2>
            <div className="post-meta">
                <span>{formatDate(post.created_at || post.createdAt)}</span>
                {post.category?.name && <span> · {post.category.name}</span>}
                {post.author?.login && <span> · by {post.author.login}</span>}
            </div>

            {/* HTML-контент поста */}
            <div
                className="post-content"
                dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />

            <div className="post-actions">
                <button
                    className={`mini-btn ${post.liked ? 'is-on' : ''}`}
                    onClick={() => dispatch(toggleLike(post.id))}
                >
                    ♥ {post.likes ?? 0}
                </button>
                <button
                    className={`mini-btn ${post.favorited ? 'is-on' : ''}`}
                    onClick={() => dispatch(toggleFavorite(post.id))}
                >
                    ☆ {post.favorites ?? 0}
                </button>
                <button
                    className="mini-btn"
                    onClick={() => navigate(`/posts/${post.id}/edit`)}
                >
                    ✎ Edit
                </button>
            </div>

            {/* ниже потом подключим блок комментариев */}
            <div id="comments-anchor" />
        </div>
    );
}
