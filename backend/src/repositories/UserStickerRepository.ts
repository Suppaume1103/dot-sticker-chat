// ============================================================
// repositories/UserStickerRepository.ts — user_stickersテーブルへのSQLクエリだけを持つクラス
// ============================================================

import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import type { UserSticker } from "../entities/UserSticker";
import type { Sticker } from "../entities/Sticker";

function toSticker(row: {
  id: string;
  prompt_id: string;
  creator_id: string;
  pixels: number[];
  block_x: number;
  block_y: number;
  created_at: Date;
}): Sticker {
  return {
    id: row.id,
    promptId: row.prompt_id,
    creatorId: row.creator_id,
    pixels: row.pixels,
    blockX: row.block_x,
    blockY: row.block_y,
    createdAt: row.created_at,
  };
}

// トレイ（GET /api/users/me/tray）用。Stickerに、誰がどう手に入れたか（acquiredVia/acquiredAt）を足しただけの交差型。
export type TrayItem = Sticker & { acquiredVia: "plaza" | "chat" | "created"; acquiredAt: Date };

function toUserSticker(row: {
  user_id: string;
  sticker_id: string;
  acquired_via: "plaza" | "chat" | "created";
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

  // 投稿処理（StickerSubmissionService）が、投稿成功直後に作者自身のトレイへ自動登録するための専用INSERT。
  // 投稿処理自体のトランザクションには参加しない（失敗してもシール投稿自体は成立済みのため致命的ではない）。
  async insertForCreator(userId: string, stickerId: string): Promise<UserSticker> {
    const result = await pool.query(
      `INSERT INTO user_stickers (user_id, sticker_id, acquired_via)
       VALUES ($1, $2, 'created')
       RETURNING user_id, sticker_id, acquired_via, acquired_at`,
      [userId, stickerId],
    );
    return toUserSticker(result.rows[0]);
  }

  // ChatServiceがシール送信時に「所持しているか」を確認するための取得。
  // トランザクションに参加する必要が無いので、insertと違いclientは受け取らずpoolを直接使う。
  async findByUserAndSticker(userId: string, stickerId: string): Promise<UserSticker | null> {
    const result = await pool.query(
      "SELECT user_id, sticker_id, acquired_via, acquired_at FROM user_stickers WHERE user_id = $1 AND sticker_id = $2",
      [userId, stickerId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return toUserSticker(result.rows[0]);
  }

  // I1: 「使える札」は期限内（expires_at > now()）のものだけ。
  // promptsとJOINして期限判定をWHERE句で行う
  async findTrayForUser(userId: string): Promise<TrayItem[]> {
    const result = await pool.query(
      `SELECT
         s.id, s.prompt_id, s.creator_id, s.pixels, s.block_x, s.block_y, s.created_at,
         u.acquired_via, u.acquired_at
       FROM user_stickers u
       JOIN stickers s ON s.id = u.sticker_id
       JOIN prompts p ON p.id = s.prompt_id
       WHERE u.user_id = $1 AND p.expires_at > now()
       ORDER BY u.acquired_at DESC`,
      [userId],
    );
    return result.rows.map((row) => ({
      ...toSticker(row),
      acquiredVia: row.acquired_via,
      acquiredAt: row.acquired_at,
    }));
  }
}
