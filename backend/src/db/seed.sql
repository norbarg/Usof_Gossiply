USE usof_db;

-- =========================
-- USERS (idempotent upsert)
-- пароль у всех: "password123"
-- =========================
INSERT INTO users (login, password_hash, full_name, email, email_verified, role)
VALUES
  ('admin', '$2a$10$xr383BbORypcICDTgw9vDu1vyKs1S.JUWwyhSe1HcOvfSWyMCGCtq', 'Admin User', 'admin@example.com', 1, 'admin'),
  ('alice', '$2a$10$xr383BbORypcICDTgw9vDu1vyKs1S.JUWwyhSe1HcOvfSWyMCGCtq', 'Alice Johnson', 'alice@example.com', 1, 'user'),
  ('bob',   '$2a$10$xr383BbORypcICDTgw9vDu1vyKs1S.JUWwyhSe1HcOvfSWyMCGCtq', 'Bob Smith',    'bob@example.com',   1, 'user'),
  ('carol', '$2a$10$xr383BbORypcICDTgw9vDu1vyKs1S.JUWwyhSe1HcOvfSWyMCGCtq', 'Carol White',  'carol@example.com', 1, 'user'),
  ('dave',  '$2a$10$xr383BbORypcICDTgw9vDu1vyKs1S.JUWwyhSe1HcOvfSWyMCGCtq', 'Dave Lee',     'dave@example.com',  1, 'user')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  email = VALUES(email),
  role = VALUES(role);

SET @u_admin = (SELECT id FROM users WHERE login='admin');
SET @u_alice = (SELECT id FROM users WHERE login='alice');
SET @u_bob   = (SELECT id FROM users WHERE login='bob');
SET @u_carol = (SELECT id FROM users WHERE login='carol');
SET @u_dave  = (SELECT id FROM users WHERE login='dave');

-- ===============
-- CATEGORIES
-- ===============
INSERT INTO categories (title, description) VALUES
  ('JavaScript', 'Questions about JS'),
  ('Databases',  'SQL, NoSQL and more'),
  ('Node.js',    'Backend with Node'),
  ('CSS',        'Styling and layouts'),
  ('Algorithms', 'CS fundamentals')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

SET @c_js   = (SELECT id FROM categories WHERE title='JavaScript');
SET @c_db   = (SELECT id FROM categories WHERE title='Databases');
SET @c_node = (SELECT id FROM categories WHERE title='Node.js');
SET @c_css  = (SELECT id FROM categories WHERE title='CSS');
SET @c_algo = (SELECT id FROM categories WHERE title='Algorithms');

-- =========
-- POSTS
-- =========

-- Post 1 (alice)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_alice,
       'How to debounce input in React?',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','I need to debounce search input in React. Any best practices?'),
         JSON_OBJECT('type','image','url','https://picsum.photos/800/300','alt','react ui','caption','Example UI')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='How to debounce input in React?');

-- Post 2 (bob)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_bob,
       'Optimize MySQL query with JOINs',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','My JOIN-heavy query is slow. How can I optimize it?')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Optimize MySQL query with JOINs');

-- Post 3 (carol)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_carol,
       'Node.js best practices',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','What are must-know patterns and best practices for Node.js services?')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Node.js best practices');

-- Post 4 (dave, INACTIVE)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_dave,
       'CSS Grid vs Flexbox',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','When should I prefer CSS Grid over Flexbox and vice versa?')
       ),
       'inactive', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='CSS Grid vs Flexbox');

-- Post 5 (alice)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_alice,
       'Binary search edge cases',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','What are common off-by-one mistakes in binary search implementations?')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Binary search edge cases');

SET @p1 = (SELECT id FROM posts WHERE title='How to debounce input in React?');
SET @p2 = (SELECT id FROM posts WHERE title='Optimize MySQL query with JOINs');
SET @p3 = (SELECT id FROM posts WHERE title='Node.js best practices');
SET @p4 = (SELECT id FROM posts WHERE title='CSS Grid vs Flexbox');
SET @p5 = (SELECT id FROM posts WHERE title='Binary search edge cases');

-- =======================
-- POST <-> CATEGORIES
-- =======================
INSERT IGNORE INTO post_categories (post_id, category_id) VALUES
  (@p1, @c_js), (@p1, @c_node),
  (@p2, @c_db),
  (@p3, @c_node),
  (@p4, @c_css),
  (@p5, @c_algo);

-- ==========
-- COMMENTS
-- ==========
INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p1, @u_bob,   'Use lodash.debounce or a custom hook that wraps setTimeout/clearTimeout.', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p1 AND author_id=@u_bob AND content LIKE 'Use lodash.debounce%');

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p1, @u_carol, 'Consider React''s useDeferredValue for smoother UX when typing.', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p1 AND author_id=@u_carol AND content LIKE 'Consider React%');

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p2, @u_alice, 'Add proper indexes and run EXPLAIN; check rows examined and ref columns.', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p2 AND author_id=@u_alice);

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p3, @u_dave,  'Take a look at nodebestpractices repository for a great checklist.', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p3 AND author_id=@u_dave);

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p5, @u_bob, 'Edge case: when low > high — make sure your loop terminates.', NOW(), 'inactive'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p5 AND author_id=@u_bob AND status='inactive');

SET @c_inactive = (SELECT id FROM comments WHERE post_id=@p5 AND author_id=@u_bob LIMIT 1);

-- ======
-- LIKES
-- ======
INSERT IGNORE INTO likes (author_id, post_id, comment_id, type) VALUES
  (@u_bob,   @p1, NULL, 'like'),
  (@u_carol, @p1, NULL, 'like'),
  (@u_dave,  @p1, NULL, 'dislike'),
  (@u_alice, @p2, NULL, 'like'),
  (@u_alice, @p3, NULL, 'like');

INSERT IGNORE INTO likes (author_id, post_id, comment_id, type)
SELECT @u_alice, NULL, @c_inactive, 'like'
WHERE @c_inactive IS NOT NULL;




