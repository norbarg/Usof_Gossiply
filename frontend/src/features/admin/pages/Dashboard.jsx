import React from 'react';
import { navigate } from '../../../shared/router/helpers';

export default function Dashboard() {
    return (
        <div className="admin-page">
            <h2
                className="compose-title inria-serif-bold"
                style={{ marginBottom: 12 }}
            >
                Dashboard
            </h2>

            <div className="admin-cards-grid">
                <button
                    className="stat-card"
                    onClick={() => navigate('/admin/users')}
                >
                    <div className="stat-card__title">Users</div>
                    <div className="stat-card__hint">Manage users & roles</div>
                </button>

                <button
                    className="stat-card"
                    onClick={() => navigate('/admin/posts')}
                >
                    <div className="stat-card__title">Posts</div>
                    <div className="stat-card__hint">Moderate posts</div>
                </button>

                <button
                    className="stat-card"
                    onClick={() => navigate('/admin/comments')}
                >
                    <div className="stat-card__title">Comments</div>
                    <div className="stat-card__hint">Moderate comments</div>
                </button>

                <button
                    className="stat-card"
                    onClick={() => navigate('/admin/categories')}
                >
                    <div className="stat-card__title">Categories</div>
                    <div className="stat-card__hint">
                        Create / edit / delete
                    </div>
                </button>
            </div>
        </div>
    );
}
