// backend/src/controllers/AuthController.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Users } from '../models/UserModel.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { sendEmail } from '../utils/mailer.js';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

async function insertVerifyToken(user_id) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ч
    await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [user_id, token, expiresAt]
    );
    return token;
}
function renderVerifyPage({
    ok = true,
    title = ok ? 'Email confirmed' : 'Link is not valid',
    message = ok
        ? 'Your email has been verified successfully.'
        : 'The verification link is invalid or has expired.',
    submessage = ok
        ? 'You can now close this tab and log in.'
        : 'Request a new verification link and try again.',
    buttonText = ok ? 'Open Gossiply' : 'Back to Gossiply',
    redirectTo = FRONTEND_ORIGIN,
    redirectMs = 4200,
} = {}) {
    // простая шумовая подложка (base64), чтобы не тянуть файлы
    const NOISE =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAF3gJ1c6CQLgAAAABJRU5ErkJggg==';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} · Gossiply</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inria+Serif:wght@400;700&display=swap">
  <style>
    :root{
      --bg:#0d0b12;
      --card:#15111d;
      --border:rgba(255,255,255,0.12);
      --text:#e9ecf2;
      --muted:#cfd5e4;
      --violet:#6e6be8;
      --violet-2:#8a5cff;
      --radius:40px;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      background: var(--bg);
      color: var(--text);
      font-family: "Inria Serif", ui-serif, Georgia, serif;
      display:grid;
      place-items:center;
      overflow:hidden;
    }
    .veil{
      position:fixed; inset:0; z-index:0;
      background:
        radial-gradient(60% 50% at 70% 15%, rgba(138,92,255,0.35) 0%, rgba(138,92,255,0.10) 35%, transparent 70%),
        radial-gradient(45% 40% at 15% 35%, rgba(110,107,232,0.35) 0%, rgba(110,107,232,0.10) 35%, transparent 70%),
        var(--bg);
      filter:saturate(115%);
    }
    .veil::after{
      content:""; position:absolute; inset:-50%;
      background:url(${NOISE}) repeat 0 0 / 200px 200px;
      opacity:.08; animation: drift 14s linear infinite;
    }
    @keyframes drift{
      to { transform: translate3d(200px,120px,0) }
    }

    .wrap{ position:relative; z-index:1; width:min(760px,96vw); padding:24px; }
    .card{
      background:var(--card);
      border:1px solid var(--border);
      border-radius:var(--radius);
      padding:34px 36px 30px;
      box-shadow:0 10px 28px rgba(0,0,0,.35);
      animation: rise .45s ease both;
    }
    @keyframes rise {
      from { opacity:0; transform: translateY(8px) scale(.98) }
      to   { opacity:1; transform: none }
    }

    .header{
      display:grid; grid-template-columns:40px 1fr; gap:14px; align-items:center; margin-bottom:12px;
    }
    .logo{
      width:36px; height:36px; object-fit:contain; filter: drop-shadow(0 0 10px rgba(110,107,232,.35));
    }
    h1{ margin:0; font-size:28px; }
    .ok{ color: var(--text); }
    .bad{ color: #ff6b7a; }

    .msg{ margin:12px 0 6px; color:var(--text); font-size:18px; line-height:1.4 }
    .sub{ margin:0 0 18px; color:var(--muted); font-size:16px }

    .cta{
      display:flex; gap:10px; align-items:center; justify-content:flex-end;
      border-top:1px dashed rgba(255,255,255,.12); padding-top:14px;
    }
    .btn{
      appearance:none; cursor:pointer; border-radius:14px; border:1px solid rgba(255,255,255,.14);
      background: linear-gradient(180deg, rgba(110,107,232,.25), rgba(110,107,232,.16));
      color:#fff; font-family:inherit; font-size:16px; line-height:1;
      padding:10px 14px;
      text-decoration:none; display:inline-flex; align-items:center; gap:10px;
      transition: transform .06s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .btn:hover{ box-shadow:0 6px 22px rgba(110,107,232,.28); border-color: rgba(110,107,232,.55); }
    .btn:active{ transform: translateY(1px) }

    .icon{
      width:18px; height:18px; display:inline-block; border-radius:50%;
      background: ${
          /* small glowing dot */ ''
      } radial-gradient(50% 50% at 50% 50%, var(--violet-2) 0%, var(--violet) 60%, transparent 70%);
      box-shadow: 0 0 14px rgba(110,107,232,.6);
    }
    .status{
      display:flex; align-items:center; gap:10px; margin:8px 0 2px; font-size:16px; color:var(--muted);
    }

    /* auto-fade after redirect */
    .fade-out{ animation: fadeout .4s ease forwards; }
    @keyframes fadeout{ to{ opacity:0 } }
  </style>
</head>
<body>
  <div class="veil" aria-hidden></div>
  <div class="wrap">
    <section class="card" id="card">
      <div class="header">
        <img class="logo" src="${FRONTEND_ORIGIN}/logo.svg" alt="">
        <h1 class="${ok ? 'ok' : 'bad'}">${title} ${ok ? '✅' : '⚠️'}</h1>
      </div>

      <p class="msg">${message}</p>
      <p class="sub">${submessage}</p>

      <div class="status">
        <span class="icon" aria-hidden></span>
        <span>Redirecting to the app…</span>
      </div>

      <div class="cta">
        <a class="btn" href="${redirectTo}"> ${buttonText}</a>
      </div>
    </section>
  </div>

  <script>
    // мягкий автопереход и лёгкое затухание карточки
    setTimeout(function(){
      document.getElementById('card')?.classList.add('fade-out');
      setTimeout(function(){ location.href = ${JSON.stringify(
          redirectTo
      )} }, 350);
    }, ${Number.isFinite(redirectMs) ? redirectMs : 4200});
  </script>
</body>
</html>`;
}
export const AuthController = {
    async register(req, res) {
        const { login, password, password_confirmation, email, full_name } =
            req.body;

        if (
            !login ||
            !password ||
            !password_confirmation ||
            !email ||
            !full_name
        ) {
            return res.status(400).json({
                error: 'login, password, password_confirmation, email, full_name are required',
            });
        }

        if (password !== password_confirmation) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const existing =
            (await Users.findByLoginOrEmail(login)) ||
            (await Users.findByLoginOrEmail(email));

        if (existing)
            return res.status(409).json({
                error: 'User with this login or email already exists',
            });

        const password_hash = await hashPassword(password);
        const user = await Users.create({
            login,
            password_hash,
            full_name,
            email,
            role: 'user',
            profile_picture: env.DEFAULT_AVATAR,
        });
        const token = await insertVerifyToken(user.id);
        const link = `${
            env.API_URL
        }/api/auth/confirm-email/${encodeURIComponent(token)}`;

        await sendEmail({
            to: email,
            subject: 'Confirm your email',
            html: `
    <h2>Confirm Email</h2>
    <p>Hello,  ${full_name}!</p>
    <p>Click the button to confirm your email:</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Confirm Email</a></p>
    <p>If the button doesn't work, just open the link:</p>
    <p>${link}</p>
    <p>Expiration: 24 hours.</p>
  `,
        });

        return res.status(201).json({
            message: 'Registered successfully. Check your email to confirm.',
        });
    },
    async confirmEmail(req, res) {
        const { token } = req.params;
        res.set('Content-Type', 'text/html; charset=utf-8');

        if (!token) {
            return res.status(400).send(
                renderVerifyPage({
                    ok: false,
                    title: 'Token required',
                    message:
                        'We couldn’t find a verification token in your link.',
                    submessage: 'Please request a new email verification link.',
                })
            );
        }

        try {
            const [rows] = await pool.query(
                'SELECT * FROM email_verification_tokens WHERE token = ? LIMIT 1',
                [token]
            );
            const row = rows[0];

            if (!row) {
                return res.status(400).send(
                    renderVerifyPage({
                        ok: false,
                        title: 'Link is not valid',
                        message:
                            'The verification link is invalid or has already been used.',
                        submessage:
                            'Request a new verification link and try again.',
                    })
                );
            }

            if (new Date(row.expires_at).getTime() < Date.now()) {
                await pool.query(
                    'DELETE FROM email_verification_tokens WHERE id=?',
                    [row.id]
                );
                return res.status(400).send(
                    renderVerifyPage({
                        ok: false,
                        title: 'Link expired',
                        message: 'This verification link has expired.',
                        submessage: 'Request a fresh link from the app.',
                    })
                );
            }

            await pool.query('UPDATE users SET email_verified=1 WHERE id=?', [
                row.user_id,
            ]);
            await pool.query(
                'DELETE FROM email_verification_tokens WHERE id=?',
                [row.id]
            );

            return res.status(200).send(
                renderVerifyPage({
                    ok: true,
                    title: 'Email confirmed',
                    message: 'Your email has been verified successfully.',
                    submessage: 'You can now sign in to your account.',
                })
            );
        } catch (e) {
            console.error(e);
            return res.status(500).send(
                renderVerifyPage({
                    ok: false,
                    title: 'Something went wrong',
                    message: 'We could not complete your request.',
                    submessage: 'Please try again in a moment.',
                })
            );
        }
    },
    async login(req, res) {
        const { login, email, password } = req.body;

        if ((!login && !email) || !password) {
            return res
                .status(400)
                .json({ error: 'Provide login or email and password' });
        }

        const identifier = login || email;
        const user = await Users.findByLoginOrEmail(identifier);

        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.email_verified)
            return res.status(403).json({ error: 'Email not verified' });

        const ok = await comparePassword(password, user.password_hash);

        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, role: user.role, login: user.login },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN }
        );
        return res.json({ token });
    },
    async logout(req, res) {
        // Stateless JWT logout is handled on client by discarding token. Optionally manage deny-list.
        return res.json({
            message: 'Logged out (client should discard the token)',
        });
    },
    async requestPasswordReset(req, res) {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await Users.findByLoginOrEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await pool.query(
            'DELETE FROM password_reset_tokens WHERE user_id = ?',
            [user.id]
        );

        const token = crypto.randomBytes(24).toString('hex');
        const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1h
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (:uid, :token, :exp)`,
            { uid: user.id, token, exp: expires_at }
        );

        // Письмо с токеном (пользователь копирует и вставляет в форму)
        const subject = 'USOF — Password Reset Token';
        const html = `
    <h2>Password Reset</h2>
    <p>Hello,  ${user.full_name || user.login}!</p>
    <p>You requested a password reset. Your token:</p>
    <pre style="font-size:16px;padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa">${token}</pre>
    <p>Copy the token and paste it into the "Reset token" field on the password reset page.</p>
    <p>Token expiration: 1 hour.</p>
    <p>If you did not request a reset, just ignore this email.</p>
  `;

        try {
            await sendEmail({ to: email, subject, html });
        } catch (mailErr) {
            console.error('Mail send error:', mailErr);
            // Не проваливаем весь процесс; можно вернуть 500, но в dev чаще логируем и отвечаем 200
        }

        // Не возвращаем сам токен в ответе
        return res.json({
            message: 'If that email exists, a reset token was sent.',
        });
    },
    async confirmPasswordReset(req, res) {
        const { token } = req.params;
        const { new_password } = req.body;
        if (!new_password)
            return res.status(400).json({ error: 'new_password is required' });
        const [rows] = await pool.query(
            `SELECT * FROM password_reset_tokens WHERE token = :token`,
            { token }
        );
        const prt = rows[0];
        if (!prt) return res.status(400).json({ error: 'Invalid token' });
        if (new Date(prt.expires_at) < new Date())
            return res.status(400).json({ error: 'Token expired' });
        const password_hash = await hashPassword(new_password);
        await pool.query(
            `UPDATE users SET password_hash = :ph WHERE id = :uid`,
            { ph: password_hash, uid: prt.user_id }
        );
        await pool.query(`DELETE FROM password_reset_tokens WHERE id = :id`, {
            id: prt.id,
        });
        return res.json({ message: 'Password updated' });
    },
};
