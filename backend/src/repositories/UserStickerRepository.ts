// ============================================================
// repositories/UserStickerRepository.ts — user_stickersテーブルへのSQLクエリだけを持つクラス
// ============================================================

import type { PoolClient } from "pg";
import type { UserSticker } from "../entities/UserSticker";

function toUserSticker(row: {
  user_id: string;
  sticker_id: string;
  acquired_via: "plaza" | "chat";
  acquired_at: Date;
}): UserSticker {
  return {
    userId: row.user_id,
    stickerId: row.sticker_id,
    acquiredVia: row.acquired_via,
    acquiredAt: row.acquired_at,
  };
}

export class UserStickerRepository {
  // 引数に client: PoolClient を取るのは、SaveService側でBEGIN/COMMIT/ROLLBACKするトランザクションの一部として実行される必要があるため。。
  // pool.query(...)を直接呼ぶと毎回別コネクションが使われてしまいトランザクションが効かないため、呼び出し元が保持するclientを受け取ってそれで実行する。
  // UNIQUE(user_id, sticker_id)違反（I1の最終防壁）はここでcatchせず、そのまま投げる。
  async insert(
    client: PoolClient,
    userId: string,
    stickerId: string,
    acquiredVia: "plaza" | "chat",
  ): Promise<UserSticker> {
    const result = await client.query(
      `INSERT INTO user_stickers (user_id, sticker_id, acquired_via)
       VALUES ($1, $2, $3)
       RETURNING user_id, sticker_id, acquired_via, acquired_at`,
      [userId, stickerId, acquiredVia],
    );
    return toUserSticker(result.rows[0]);
  }
}
