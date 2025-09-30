import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: +env.SMTP_PORT,
    secure: false,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendEmail({ to, subject, html }) {
    return transporter.sendMail({
        from: env.SMTP_FROM || 'UsOf <no-reply@usof.local>',
        to,
        subject,
        html,
    });
}
