// ============================================================
// repositories/CollectionRepository.ts — collectionsテーブルへのSQLクエリだけを持つクラス
// I4: append-only。DELETEは一切しない。
// ============================================================

import type { PoolClient } from "pg";
import { pool } from "../db/pool";
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

// 「集めた」一覧（GET /api/users/me/collections）用。Stickerに、最初に手に入れた日時（firstAcquiredAt）を足しただけの交差型（&）。
export type CollectedSticker = Sticker & { firstAcquiredAt: Date };

export class CollectionRepository {
  // --- ON CONFLICT ... DO UPDATE（upsert）について ---
  // PRIMARY KEY(user_id, sticker_id)が既に存在する行にINSERTしようとすると
  // 通常はエラーになるが、ON CONFLICTを付けると「衝突時にどうするか」を指定できる。
  // ここでは既存行があればgot_normalをtrueに更新するだけにし、無ければ新規INSERTする（＝どちらの場合も最終的にgot_normal=trueになる）。
  // I5: 主キーが(user_id, sticker_id)なので、同じユーザーが同じstickerに対して何度saveしても行は1つしか増えない＝寄与は必ず最大1。
  // I4: UPDATEはgot_normalをtrueにするだけで、一度trueになった行をfalseに戻したりDELETEしたりする経路はこのクラスに存在しない。
  async upsertGotNormal(client: PoolClient, userId: string, stickerId: string): Promise<void> {
    await client.query(
      `INSERT INTO collections (user_id, sticker_id, got_normal)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, sticker_id) DO UPDATE SET got_normal = true`,
      [userId, stickerId],
    );
  }

  // ChatServiceがシール送信時に「所持しているか」を確認するための取得。
  async findCollectedByUser(userId: string): Promise<CollectedSticker[]> {
    const result = await pool.query(
      `SELECT
         s.id, s.prompt_id, s.creator_id, s.pixels, s.block_x, s.block_y, s.created_at,
         c.first_acquired_at
       FROM collections c
       JOIN stickers s ON s.id = c.sticker_id
       WHERE c.user_id = $1 AND c.got_normal = true
       ORDER BY c.first_acquired_at DESC`,
      [userId],
    );
    return result.rows.map((row) => ({
      ...toSticker(row),
      firstAcquiredAt: row.first_acquired_at,
    }));
  }
}
