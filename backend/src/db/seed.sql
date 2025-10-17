USE usof_db;

-- =========================
-- USERS (idempotent upsert)
-- password: "password123"
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
  ('Celebrity', 'news, rumors and discussions of famous people.'),
  ('Music',  'new tracks, albums, concerts, musicians'' scandals.'),
  ('Movies and TV series',    'premieres, actors, filming insiders.'),
  ('Romances and relationships',        'who''s dating whom, weddings, divorces.'),
  ('Scandals and dramas', 'loud quarrels, revelations, conflicts.'),
  ('Fashion and style', 'discussion of images, fails on the red carpet.'),
  ('Health and beauty', 'fitness trends, diet tips, cosmetic procedures.'),
  ('Social networks and hype', 'what is currently blowing up Instagram, TikTok, YouTube.'),
  ('Plastic surgery and beauty', 'discussion of appearance, cosmetology, changes.'),
  ('Insiders and rumors', 'unverified but hot news.'),
  ('Retro stars', 'discussion of legends of the past, \\\"where are they now\\\".')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

SET @c_js   = (SELECT id FROM categories WHERE title='Celebrity');
SET @c_db   = (SELECT id FROM categories WHERE title='Music');
SET @c_node = (SELECT id FROM categories WHERE title='Movies and TV series');
SET @c_css  = (SELECT id FROM categories WHERE title='Romances and relationships');
SET @c_algo = (SELECT id FROM categories WHERE title='Scandals and dramas');

-- =========
-- POSTS
-- =========

-- Post 1 (alice)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_alice,
       'Kimberly Kardashian’s new skincare line allegedly smells like fries',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','The influencer mogul’s latest beauty drop, Glow Eat Repeat, has sparked unexpected reviews: “works fine, but why does it smell like a McDonald’s bag?” Reddit threads are exploding with theories — from “fry oil extract” to “marketing genius.”
Kimber’s team released a statement claiming the scent is “an intentional comfort aroma.” Meanwhile, TikTokers are using it as perfume and calling it “the most realistic fast-food aura ever.”
We live in strange, delicious times. 🍟'),
         JSON_OBJECT('type','image','url','https://picsum.photos/800/300','alt','react ui','caption','Example UI')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Kimberly Kardashian’s new skincare line allegedly smells like fries');

-- Post 2 (bob)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_bob,
       'Leonardo Dicaprio arrives at film premiere with a date aged 26 — internet shocked he’s ‘experimenting older’',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','Fans were stunned when Leonardo Dicaprio appeared at the Venice Film Festival red carpet holding hands with a 26-year-old model. “He’s entering his mature phase,” one comment reads. Another says: “this is basically retirement age for him.”
The actor laughed off questions, saying, “I’m just here for the cinema.” Sources claim he whispered “and the catering” right after.
Cultural analysts call it a “watershed moment for men in their 40s pretending to be 29.”')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Leonardo Dicaprio arrives at film premiere with a date aged 26 — internet shocked he’s ‘experimenting older’');

-- Post 3 (carol)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_carol,
       'Taylor Swift spotted eating something mysterious — fans call it her ‘chaos era snack',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','Witnesses at a Nashville café claim they saw Tayla Swift “experimenting with an unusual snack” during a late-night writing session. According to one fan, “it looked… suspiciously brown.” Another swears it was just vegan protein pudding, but the debate is raging online.
TikTok has already spawned a viral trend called #SwiftSnackChallenge, where fans recreate bizarre meals “to summon inspiration.” Tayla’s team has declined to comment — fueling the chaos even more.')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Taylor Swift spotted eating something mysterious — fans call it her ‘chaos era snack');

-- Post 4 (dave, INACTIVE)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_dave,
       'Kanye West announces engagement — to himself',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','Rapper and designer Kanye West posted a photo of his hand with two identical diamond rings, captioned: “I said yes (twice).” Fans are calling it the most on-brand move of 2025. Sources say the wedding theme will be “minimalist narcissism” with a mirror aisle and solo vows.')
       ),
       'inactive', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Kanye West announces engagement — to himself');

-- Post 5 (alice)
INSERT INTO posts (author_id, title, content, status, publish_date)
SELECT @u_alice,
       'Ariana Grande spotted kissing random strangers ‘for research’',
       JSON_ARRAY(
         JSON_OBJECT('type','text','text','Witnesses in downtown L.A. claim Ariana Grande kissed three homeless persons within ten minutes, allegedly saying it was “for a method-acting role about empathy.” One fan reports: “She asked if I recycle and then kissed me goodbye.”
Her PR later clarified: “Ariana is exploring the boundaries of human connection.” Twitter: “Girl, that’s not sociology, that’s saliva.”')
       ),
       'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title='Ariana Grande spotted kissing random strangers ‘for research’');

SET @p1 = (SELECT id FROM posts WHERE title='Kimberly Kardashian’s new skincare line allegedly smells like fries');
SET @p2 = (SELECT id FROM posts WHERE title='Leonardo Dicaprio arrives at film premiere with a date aged 26 — internet shocked he’s ‘experimenting older’');
SET @p3 = (SELECT id FROM posts WHERE title='Taylor Swift spotted eating something mysterious — fans call it her ‘chaos era snack’');
SET @p4 = (SELECT id FROM posts WHERE title='Kanye West announces engagement — to himself');
SET @p5 = (SELECT id FROM posts WHERE title='Ariana Grande spotted kissing random strangers ‘for research’');

-- =======================
-- POST <-> CATEGORIES
-- =======================
INSERT IGNORE INTO post_categories (post_id, category_id) VALUES
  (@p1, c_algo), (@p1, @c_js),
  (@p2, @c_node),
  (@p3, @c_node),
  (@p4, @c_css),
  (@p5, @c_algo);

-- ==========
-- COMMENTS
-- ==========
INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p1, @u_bob,   'OMG', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p1 AND author_id=@u_bob AND content LIKE 'OMG');

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p1, @u_carol, 'No way!', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p1 AND author_id=@u_carol AND content LIKE 'No way!');

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p2, @u_alice, 'Holy cow', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p2 AND author_id=@u_alice);

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p3, @u_dave,  'I love it.', NOW(), 'active'
WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id=@p3 AND author_id=@u_dave);

INSERT INTO comments (post_id, author_id, content, publish_date, status)
SELECT @p5, @u_bob, 'I know it.', NOW(), 'inactive'
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




