// ============================================================
// db/pool.ts — PostgreSQL接続プールを1つだけ作ってexportするファイル
// ============================================================

import { Pool } from "pg";

// ローカルDBは使わず、開発時も本番時も常にRenderのマネージドPostgreSQL（SSL必須・自己署名証明書）に接続する運用のため、
// NODE_ENVで分岐せず常時SSLを有効化する（README.md「デプロイ先」参照）。
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
