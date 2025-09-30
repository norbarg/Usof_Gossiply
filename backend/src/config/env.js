import dotenv from 'dotenv';
dotenv.config();
export const env = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: +(process.env.DB_PORT || 3306),
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'usof_db',
    JWT_SECRET: process.env.JWT_SECRET || 'devsecret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    API_URL: process.env.API_URL || 'http://localhost:3000',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: +(process.env.SMTP_PORT || 587),
    SMTP_USER: process.env.SMTP_USER || 'lut4ui.v.mire@gmail.com',
    SMTP_PASS: process.env.SMTP_PASS || 'stav sync xkge awci',
    SMTP_FROM: process.env.SMTP_FROM || '"UsOf" <no-reply@usof.local>',
};
