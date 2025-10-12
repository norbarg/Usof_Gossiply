// backend/src/app.js
import express from 'express';
import morgan from 'morgan';
import 'express-async-errors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '..', 'uploads');

// Нормализатор пути для "/uploads"
app.use((req, res, next) => {
    if (!req.path.startsWith('/uploads/')) return next();

    // если пришло "/uploads/avatars123.jpg" — перепишем на "/uploads/avatars/123.jpg"
    const fixed = req.path.replace(
        /^\/uploads\/avatars(?=\d)/i,
        '/uploads/avatars/'
    );
    if (fixed !== req.path) {
        const tryFile = path.join(
            uploadsDir,
            fixed.replace(/^\/uploads\//, '')
        );
        if (fs.existsSync(tryFile)) {
            req.url = fixed; // переписываем URL и дальше отдаст express.static
        }
    }
    next();
});

const serveUploads = express.static(uploadsDir, {
    index: false,
    setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
});
app.use('/uploads', serveUploads);
app.use('/api/uploads', serveUploads); // ← ВАЖНО для dev-прокси (/api)

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/default.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '../default.png'));
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
export default app;
