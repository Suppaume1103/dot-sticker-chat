// ============================================================
// db/pool.ts — PostgreSQL接続プールを1つだけ作ってexportするファイル
// ============================================================

import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
