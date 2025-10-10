// utils/mailer.js
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const port = Number(env.SMTP_PORT);
const isSecure = port === 465;

// подчистим входные данные
const smtpUser = (env.SMTP_USER || '').trim();
const smtpPass = (env.SMTP_PASS || '').replace(/\s+/g, ''); // УБИРАЕМ ПРОБЕЛЫ
const smtpFrom = (env.SMTP_FROM || smtpUser).trim();

export const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: isSecure,
    auth: { user: smtpUser, pass: smtpPass },
    requireTLS: !isSecure,
    tls: { minVersion: 'TLSv1.2' },
    // включи логирование, если нужно дебажить:
    // logger: true, debug: true,
});

transporter.verify().then(
    () => console.log('[MAIL] SMTP connection OK'),
    (err) => console.error('[MAIL] SMTP verify failed:', err?.message || err)
);

export async function sendEmail({ to, subject, html, text }) {
    if (!smtpFrom) throw new Error('SMTP_FROM/SMTP_USER is required');
    return transporter.sendMail({ from: smtpFrom, to, subject, html, text });
}
