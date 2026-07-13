// ============================================================
// db/pool.ts — PostgreSQL接続プールを1つだけ作ってexportするファイル
// ============================================================

import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false }
  })
});
