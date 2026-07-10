// ============================================================
// repositories/StickerRepository.ts — stickersテーブルへのSQLクエリだけを持つクラス
// ============================================================

import { pool } from "../db/pool";
import type { Sticker } from "../entities/Sticker";

// DBの行（スネークケース）をSticker型に詰め替える共通処理。
// pixelsはpg側でJSONB→JS配列に自動変換されるため、そのまま使用できる
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

// GET /field のレスポンス用に、保存数まで付与した形。
// Stickerに`saveCount`を追加しただけの型なので、交差型（&）で表現する。
export type StickerWithSaveCount = Sticker & { saveCount: number };

// 「描いた」一覧（CollectionQueryService.getCreated）専用。失効日時（expiresAt、判断はservice層で行う生値）を追加。
export type StickerWithSaveCountAndExpiry = StickerWithSaveCount & { expiresAt: Date };

export class StickerRepository {
  // UNIQUE(prompt_id, creator_id)・UNIQUE(prompt_id, block_x, block_y)の
  // 違反はここでcatchせず、そのまま例外として呼び出し元（FieldPlacementService）に投げる。
  // 「保存していいか」の判断はrepositoryの仕事ではないため。
  async insert(
    promptId: string,
    creatorId: string,
    pixels: number[],
    blockX: number,
    blockY: number,
  ): Promise<Sticker> {
    const result = await pool.query(
      `INSERT INTO stickers (prompt_id, creator_id, pixels, block_x, block_y)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING id, prompt_id, creator_id, pixels, block_x, block_y, created_at`,
      [promptId, creatorId, JSON.stringify(pixels), blockX, blockY],
    );
    return toSticker(result.rows[0]);
  }

  // 空きブロック計算用に、そのお題で既に使われているブロック座標を全件取得する。
  async findUsedBlocks(promptId: string): Promise<{ blockX: number; blockY: number }[]> {
    const result = await pool.query(
      "SELECT block_x, block_y FROM stickers WHERE prompt_id = $1",
      [promptId],
    );
    return result.rows.map((row) => ({ blockX: row.block_x, blockY: row.block_y }));
  }

  // 広場全データ（GET /field用）。保存数はcollections.got_normal=trueの件数。
  // I7: 作者自身は自作の保存数に含まれないため、collections.user_id <> stickers.creator_id を条件に含める。
  async findByPromptWithSaveCounts(promptId: string): Promise<StickerWithSaveCount[]> {
    const result = await pool.query(
      `SELECT
         s.id, s.prompt_id, s.creator_id, s.pixels, s.block_x, s.block_y, s.created_at,
         COUNT(c.user_id) AS save_count
       FROM stickers s
       LEFT JOIN collections c
         ON c.sticker_id = s.id
         AND c.got_normal = true
         AND c.user_id <> s.creator_id
       WHERE s.prompt_id = $1
       GROUP BY s.id
       ORDER BY s.created_at ASC`,
      [promptId],
    );
    return result.rows.map((row) => ({
      ...toSticker(row),
      saveCount: Number(row.save_count),
    }));
  }

  // 「描いた」一覧（CollectionQueryService）用。
  // 集計の軸がprompt単位ではなく作者（creator_id)単位になるので、prompt_idを指定せずにcreator_idで検索する。
  async findByCreatorWithSaveCounts(creatorId: string): Promise<StickerWithSaveCountAndExpiry[]> {
    const result = await pool.query(
      `SELECT
         s.id, s.prompt_id, s.creator_id, s.pixels, s.block_x, s.block_y, s.created_at,
         COUNT(c.user_id) AS save_count, p.expires_at
       FROM stickers s
       JOIN prompts p ON p.id = s.prompt_id
       LEFT JOIN collections c
         ON c.sticker_id = s.id
         AND c.got_normal = true
         AND c.user_id <> s.creator_id
       WHERE s.creator_id = $1
       GROUP BY s.id, p.expires_at
       ORDER BY s.created_at DESC`,
      [creatorId],
    );
    return result.rows.map((row) => ({
      ...toSticker(row),
      saveCount: Number(row.save_count),
      expiresAt: row.expires_at,
    }));
  }

  // SaveServiceが保存対象のstickerを取得するためのid検索。
  async findById(id: string): Promise<Sticker | null> {
    const result = await pool.query(
      "SELECT id, prompt_id, creator_id, pixels, block_x, block_y, created_at FROM stickers WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return toSticker(result.rows[0]);
  }

  async findOwnSubmission(promptId: string, userId: string): Promise<Sticker | null> {
    const result = await pool.query(
      "SELECT id, prompt_id, creator_id, pixels, block_x, block_y, created_at FROM stickers WHERE prompt_id = $1 AND creator_id = $2",
      [promptId, userId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return toSticker(result.rows[0]);
  }
}
