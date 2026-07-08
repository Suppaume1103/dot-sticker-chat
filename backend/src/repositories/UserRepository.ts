// ============================================================
// repositories/UserRepository.ts — usersテーブルへのSQLクエリだけを持つクラス
// ============================================================

import { pool } from "../db/pool";
import type { User } from "../entities/User";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT id, handle, display_name, created_at FROM users WHERE id = $1",
      [id],
    );

    // rows は「見つかった行の配列」。0件なら空配列。
    if (result.rows.length === 0) {
      return null;
    }

    // DBの行（スネークケース）をUser型（キャメルケース）に詰め替える。
    const row = result.rows[0];
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  }

  async findByHandle(handle: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT id, handle, display_name, created_at FROM users WHERE handle = $1",
      [handle],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  }

  // 同じhandleが既に存在する場合、DB側のUNIQUE制約違反がそのまま例外として、投げられる
  // 「既に使われているhandleか」の判断はここではなく、呼び出し元のAuthServiceで行う。
  async create(handle: string, displayName: string): Promise<User> {
    const result = await pool.query(
      "INSERT INTO users (handle, display_name) VALUES ($1, $2) RETURNING id, handle, display_name, created_at",
      [handle, displayName],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  }
}
