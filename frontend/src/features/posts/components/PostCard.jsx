// frontend/src/features/posts/components/PostCard.jsx
import React from 'react';
import { navigate } from '../../../shared/router/helpers'; // для навигации на страницу поста
import { assetUrl } from '../../../shared/utils/assetUrl';

export default function PostCard({ post, onToggleLike, onToggleFavorite }) {
    const {
        id,
        title,
        // Автор поста
        author_login,
        author_name, // fallback, если логин отсутствует
        author_avatar, // URL аватарки автора

        // Контент
        content_plain, // полный текст поста (если нет готового excerpt)
        excerpt, // короткий текст/превью поста (если приходит с бэкенда)
        // Категории
        categories, // массив категорий, например ["news","tech"]
        category_name, // fallback, если массив категорий не приходит
        // Мета-данные
        created_at, // дата создания (публикации) поста
        likes_count = 0,
        favorites_count = 0,
        comments_count = 0,
        // Состояние относительно текущего пользователя
        liked = false,
        favorited = false,
    } = post;
    console.debug('avatar raw:', author_avatar, '->', assetUrl(author_avatar));
    // Определяем имя автора для отображения
    const displayAuthor = author_login || author_name || 'unknown';

    // Форматируем дату публикации: "Month Day, Year at HH:MM"
    let date = '';
    if (created_at) {
        const dt = new Date(created_at);
        const datePart = dt.toLocaleString('default', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
        const timePart = dt.toLocaleTimeString('default', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        date = `${datePart} at ${timePart}`;
    }

    // Формируем массив категорий для отображения
    const cats = Array.isArray(categories)
        ? categories
        : category_name
        ? [category_name]
        : [];

    // Берём короткий текст (excerpt) – либо поле excerpt с бэкенда, либо обрезаем начало полного текста
    let previewText = '';
    if (excerpt && excerpt.trim() !== '') previewText = excerpt;
    else if (content_plain) {
        const words = content_plain.split(/\s+/).filter(Boolean);
        const cutoff = 30;
        previewText = words.slice(0, cutoff).join(' ');
        if (words.length > cutoff) previewText += '…';
    }

    // Обработчик открытия полного поста (переход на страницу деталей поста)
    const handleOpen = () => {
        navigate(`/posts/${id}`);
    };

    return (
        <article className="post-card" data-id={id}>
            {/* Шапка: аватар + имя автора + дата + иконка избранного */}
            <div className="post-card__header">
                <div className="post-author">
                    <img
                        className="post-avatar"
                        src={
                            assetUrl(author_avatar) || '/placeholder-avatar.png'
                        }
                        alt={displayAuthor}
                        onError={(e) => {
                            e.currentTarget.src = '/placeholder-avatar.png';
                        }}
                    />
                    <div className="post-author__meta">
                        <div className="post-author__name">
                            @{displayAuthor}
                        </div>
                        <div className="post-author__date">{date}</div>
                    </div>
                </div>
                <button
                    type="button"
                    title={favorited ? 'In favorites' : 'Add to favorites'}
                    className={`fav-icon ${favorited ? 'is-on' : ''}`}
                    onClick={() => onToggleFavorite(id)}
                >
                    ★
                </button>
            </div>

            {/* Заголовок поста */}
            <h3 className="post-card__title" onClick={handleOpen}>
                {title}
            </h3>

            {/* Категории */}
            {cats.length > 0 && (
                <div className="post-card__cats">
                    {cats.map((c, i) => (
                        <span className="cat-chip" key={`${c}-${i}`}>
                            #{c}
                        </span>
                    ))}
                </div>
            )}

            {/* Короткий текст поста (превью) */}
            {previewText && <p className="post-card__excerpt">{previewText}</p>}

            {/* Блок действий: лайки, избранное, комментарии, чтение */}
            <div className="post-card__actions">
                <button
                    className={`mini-btn ${liked ? 'is-on' : ''}`}
                    onClick={() => onToggleLike(id)}
                    type="button"
                    title="Like"
                >
                    ♥ {likes_count}
                </button>

                <span className="post-meta">💬 {comments_count}</span>
                <button className="mini-btn" type="button" onClick={handleOpen}>
                    Read
                </button>
            </div>
        </article>
    );
}
