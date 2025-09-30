import { pool } from '../config/db.js';
export class BaseModel {
  constructor(table) {
    this.table = table;
  }
  async query(sql, params = {}) {
    const [rows] = await pool.query(sql, params);
    return rows;
  }
}
