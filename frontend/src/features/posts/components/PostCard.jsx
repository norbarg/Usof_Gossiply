import React from 'react';
import { navigate } from '../../../shared/router/helpers';
import { assetUrl } from '../../../shared/utils/assetUrl';

function formatPostDate(value) {
    try {
        const dt = new Date(value);
        const datePart = dt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
        const timePart = dt.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // 24h: 00–23
        });
        return `${datePart} at ${timePart}`;
    } catch {
        return '';
    }
}
function makePreview({ content_plain, excerpt, max = 400 }) {
    const src =
        (content_plain?.length || 0) >= (excerpt?.length || 0)
            ? content_plain
            : excerpt;

    const text = (src || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export default function PostCard({
    post,
    onToggleFavorite,
    favIconOff,
    favIconOn,
}) {
    const {
        id,
        author_id,
        title,
        author_login,
        author_name,
        author_avatar,
        content_plain,
        excerpt,
        categories,
        category_name,
        created_at,
        likes_count = 0,
        favorited = false,
    } = post;

    const displayAuthor = author_login || author_name || 'unknown';
    const authorId = Number(author_id || post?.author?.id || 0);
    const date = created_at ? formatPostDate(created_at) : '';
    const cats = Array.isArray(categories)
        ? categories
        : category_name
        ? [category_name]
        : [];

    const previewText = makePreview({ content_plain, excerpt, max: 400 });

    const openPost = (e) => {
        if (e?.preventDefault) e.preventDefault();
        try {
            const el = document.querySelector('[data-scroller]');
            const y = el ? el.scrollTop : 0;
            const st = history.state || {};
            history.replaceState({ ...st, feedY: y }, '');
            sessionStorage.setItem('feedScrollY', String(y));
            sessionStorage.setItem('feedLock', '1');
        } catch {}
        navigate(`/posts/${id}`);
    };

    return (
        <article
            className="post-card--figma post-card--clickable"
            data-id={id}
            role="button"
            tabIndex={0}
            onClick={openPost}
            onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && openPost(e)
            }
        >
            <span aria-hidden className="post-card__glow" />
            <div className="post-card__header">
                <h3 className="post-card__title">{title} </h3>

                <button
                    type="button"
                    className={`bookmark js-stop ${favorited ? 'is-on' : ''}`}
                    title={favorited ? 'In favorites' : 'Add to favorites'}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <img
                        className="bookmark__img"
                        src={favorited ? favIconOn : favIconOff}
                        alt=""
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div
                className="post-author js-stop"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    authorId && navigate(`/profile/${authorId}`);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        authorId && navigate(`/profile/${authorId}`);
                    }
                }}
            >
                <img
                    className="post-avatar"
                    src={assetUrl(author_avatar) || '/placeholder-avatar.png'}
                    alt={displayAuthor}
                    onError={(e) => {
                        e.currentTarget.src = '/placeholder-avatar.png';
                    }}
                />
                <div>
                    <div className="post-author__name">@{displayAuthor}</div>
                </div>
            </div>

            {previewText && <p className="post-card__excerpt">{previewText}</p>}

            <div className="post-card__footer">
                <div className="post-card__cats">
                    {cats.map((c, i) => (
                        <span
                            className="cat-chip cat-chip--violet"
                            key={`${c}-${i}`}
                        >
                            {c}
                        </span>
                    ))}
                </div>
                <div className="post-author__date">{date}</div>
            </div>
        </article>
    );
}
