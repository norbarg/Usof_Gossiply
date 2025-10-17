# Gossiply — Full-Stack Social App (React + Node + MySQL)

---

## Table of Contents

-   [Tech Stack](#tech-stack)
-   [Architecture & Project Structure](#architecture--project-structure)
-   [Quick Start (Local Dev)](#quick-start-local-dev)
    -   [1) Database setup](#1-database-setup)
    -   [2) Backend: config & run](#2-backend-config--run)
    -   [3) Frontend: config & run](#3-frontend-config--run)
    -   [4) Seed an admin](#4-seed-an-admin)
-   [Feature Overview](#feature-overview)
-   [Frontend Routes](#frontend-routes)
-   [Key API Endpoints](#key-api-endpoints)
-   [Environment Variables](#environment-variables)

---

## Tech Stack

**Frontend**

-   React + Vite
-   React Redux (`react-redux`)
-   Axios
-   Lightweight custom router on the History API (`src/shared/router/helpers.js`)
-   Motion (animations)
-   CSS authored in the repo (admin styles in `shared/styles/admin.css`, profile in `shared/styles/profile.css`)

**Backend**

-   Node.js + Express
-   MySQL (`mysql2`)
-   JWT auth (`jsonwebtoken`)
-   Password hashing — `bcryptjs`
-   Email via `nodemailer` (helper in `src/utils/mailer.js`)
-   DB schema — `backend/src/db/schema.sql`

---

## Architecture & Project Structure

```
Usof_Gossiply/
├─ backend/
│  ├─ package.json
│  └─ src/
│     ├─ app.js
│     ├─ server.js
│     ├─ config/
│     │  ├─ db.js
│     │  └─ env.js
│     ├─ controllers/
│     ├─ middleware/
│     ├─ models/
│     ├─ routes/
│     ├─ utils/
│     └─ db/schema.sql
│
└─ frontend/
   ├─ package.json
   ├─ vite.config.js
   └─ src/
      ├─ app/
      │  ├─ App.jsx
      │  └─ routes.jsx
      ├─ features/
      │  ├─ admin/
      │  ├─ auth/
      │  ├─ posts/
      │  ├─ categories/
      │  ├─ favorites/
      │  └─ profile/
      ├─ shared/
      │  ├─ api/axios.js
      │  ├─ router/helpers.js
      │  ├─ utils/
      │  └─ styles/
      └─ main.jsx
```

---

## Quick Start (Local Dev)

### 1) Database setup

Requires **MySQL 8+** (or compatible). Create DB and apply schema:

```bash
mysql -u root -p -e "CREATE DATABASE gossiply CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
mysql -u root -p gossiply < backend/src/db/schema.sql
```

### 2) Backend: config & run

```bash
cd backend
npm i
cp .env.example .env   # If missing, create manually using the sample below
```

**`.env` sample**

```ini
# Server
PORT=3000

# URLs for email links
BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=super_long_random_secret_here

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gossiply

# SMTP (email verification / password reset)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Gossiply <no-reply@gossiply.local>"
```

Run dev (with `nodemon`):

```bash
npm run dev
```

### 3) Frontend: config & run

```bash
cd frontend
npm i
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

### 4) Seed an admin

Register via **/register**, then in MySQL set the role to `admin` and (optionally) mark the email verified:

```sql
UPDATE users SET role='admin', email_verified=1 WHERE id=<your_id>;
```

Now **/admin** is accessible.

---

## Feature Overview

-   **Auth**: registration, login, email verification, password reset via token.
-   **Posts**: create/edit, view, like/dislike, add to favorites, categories.
-   **Comments**: threaded replies, like/dislike, status moderation (active/inactive).
-   **Favorites**: personal list of favorited posts.
-   **Profiles**:
    -   **Personal** (`/profile`): avatar, rating, your posts (including inactive), counters.
    -   **Public** (`/profile/:id`): user showcase and their posts (no private actions).
-   **Admin Panel** (`/admin`):
    -   Full-screen UI with a single page scroller and custom scrollbars.
    -   **Users**: client-side search/sort, role switch, delete, create user.
    -   **Posts**: server-side pagination, status switch, edit/view.
    -   **Comments**: status filter, text search, status switch, delete.
    -   **Categories**: local search, inline edit, create & delete.

> Note: When an **admin** creates an account via the admin UI, the server can mark `email_verified` depending on implementation. For self-registration, users verify email via the received link.

---

## Frontend Routes

-   `/` — feed
-   `/posts/:id` — post details (metrics + comments)
-   `/favorites` — favorites
-   `/categories` — categories
-   `/profile` — personal profile
-   `/profile/edit` — edit profile
-   `/profile/:id` — public user profile
-   `/login`, `/register`, `/password-reset` — auth pages
-   `/admin` (and `/admin/users`, `/admin/posts`, `/admin/comments`, `/admin/categories`) — admin panel

Routing is implemented with the History API and helpers `parsePath` / `matchPath` (see `src/shared/router/helpers.js`).

---

## Key API Endpoints

All endpoints are in README.md in backend pero.

---

## Environment Variables

**Backend (`backend/.env`)**

-   `PORT` — API port (dev proxy expects `3000`)
-   `BASE_URL` — backend base URL (used in emails)
-   `CLIENT_URL` — SPA base URL
-   `JWT_SECRET` — JWT signing secret
-   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL access
-   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP for outgoing mail

**Frontend (`frontend/.env`)**

-   `VITE_API_URL` — full API URL if you’re not using Vite proxy (e.g., `http://localhost:3000/api`)

---
