import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = sql
    .split(/;\s*\n|;\n|;\r\n/g)
    .map(s => s.trim())
    .filter(Boolean);
  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
  } finally {
    conn.release();
  }
}

(async () => {
  try {
    console.log('Initializing database...');
    await runSqlFile(path.join(__dirname, 'schema.sql'));
    await runSqlFile(path.join(__dirname, 'seed.sql'));
    console.log('Database initialized successfully ✅');
    process.exit(0);
  } catch (err) {
    console.error('DB init failed ❌', err);
    process.exit(1);
  }
})();
