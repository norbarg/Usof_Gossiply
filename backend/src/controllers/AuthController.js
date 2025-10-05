// backend/src/controllers/AuthController.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Users } from '../models/UserModel.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { sendEmail } from '../utils/mailer.js';

async function insertVerifyToken(user_id) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ч
    await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [user_id, token, expiresAt]
    );
    return token;
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
    <h2>Подтвердите email</h2>
    <p>Здравствуйте, ${full_name}!</p>
    <p>Нажмите кнопку, чтобы подтвердить почту:</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Подтвердить почту</a></p>
    <p>Если кнопка не работает, просто откройте ссылку:</p>
    <p>${link}</p>
    <p>Срок действия: 24 часа.</p>
  `,
        });

        return res.status(201).json({
            message: 'Registered successfully. Check your email to confirm.',
        });
    },
    async confirmEmail(req, res) {
        const { token } = req.params;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const [rows] = await pool.query(
            `SELECT * FROM email_verification_tokens WHERE token = ? LIMIT 1`,
            [token]
        );
        const row = rows[0];
        if (!row)
            return res.status(400).json({ error: 'Invalid or expired token' });

        if (new Date(row.expires_at).getTime() < Date.now()) {
            await pool.query(
                `DELETE FROM email_verification_tokens WHERE id=?`,
                [row.id]
            );
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        await pool.query(`UPDATE users SET email_verified=1 WHERE id=?`, [
            row.user_id,
        ]);
        await pool.query(`DELETE FROM email_verification_tokens WHERE id=?`, [
            row.id,
        ]);
        return res.send(`
  <html>
    <body>
      <h2>Email confirmed ✅</h2>
      <p>You can now close this tab and login.</p>
    </body>
  </html>
`);
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
        const subject = 'USOF — токен для сброса пароля';
        const html = `
    <h2>Сброс пароля</h2>
    <p>Здравствуйте, ${user.full_name || user.login}!</p>
    <p>Вы запросили сброс пароля. Ваш токен:</p>
    <pre style="font-size:16px;padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa">${token}</pre>
    <p>Скопируйте токен и вставьте его в поле «Reset token» на странице сброса пароля.</p>
    <p>Срок действия токена: 1 час.</p>
    <p>Если вы не запрашивали сброс — просто игнорируйте это письмо.</p>
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
