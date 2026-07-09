// ============================================================
// services/FieldPlacementService.ts — 空きブロックのランダム割当
// 対応invariant: I21改, I23改
// ============================================================

import { GRID_BLOCKS } from "../config/fieldConfig";
import { StickerRepository } from "../repositories/StickerRepository";
import type { Sticker } from "../entities/Sticker";

// pg（node-postgres）がUNIQUE制約違反の際にセットするエラーコード。
// PostgreSQLの規格で決まっている値（23505 = unique_violation）。
const PG_UNIQUE_VIOLATION = "23505";

// リトライしても解決しない場合に投げる専用エラー。
// 「盤面が本当に満杯」という、運用上ほぼ起こらないはずのケースを表す。
export class FieldFullError extends Error {
  constructor(promptId: string) {
    super(`field is full for prompt: ${promptId}`);
    this.name = "FieldFullError";
  }
}

// pgが投げるエラーオブジェクトの型はexportされていないため、
// 必要なプロパティ（code）だけを持つ最小限の形をここで定義して使う。
// catch節の引数は常にunknown型なので、使う前にこの形をしているか確認する。
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

const MAX_RETRY = 10;

export class FieldPlacementService {
  private stickerRepository = new StickerRepository();

  // 空きブロックをランダムに1つ選んでINSERTする。競合時は座標を変えて最大MAX_RETRY回リトライする。
  async assignAndInsert(
    promptId: string,
    creatorId: string,
    pixels: number[],
  ): Promise<Sticker> {
    const usedBlocks = await this.stickerRepository.findUsedBlocks(promptId);

    const usedKeys = new Set(usedBlocks.map((b) => `${b.blockX},${b.blockY}`));

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const { blockX, blockY } = this.pickRandomFreeBlock(usedKeys);

      try {
        return await this.stickerRepository.insert(promptId, creatorId, pixels, blockX, blockY);
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) {
          // ブロック競合以外のエラー（DB接続断など）はそのまま呼び出し元に伝える。
          throw error;
        }
        // このプロセス内で同じ座標を二度選ばないよう、失敗した座標も使用済みとして扱う。
        usedKeys.add(`${blockX},${blockY}`);
      }
    }

    throw new FieldFullError(promptId);
  }

  // GRID_BLOCKS×GRID_BLOCKSの範囲から、usedKeysに含まれない座標をランダムに1つ選ぶ。
  private pickRandomFreeBlock(usedKeys: Set<string>): { blockX: number; blockY: number } {
    for (let i = 0; i < GRID_BLOCKS * GRID_BLOCKS; i++) {
      const blockX = Math.floor(Math.random() * GRID_BLOCKS);
      const blockY = Math.floor(Math.random() * GRID_BLOCKS);
      if (!usedKeys.has(`${blockX},${blockY}`)) {
        return { blockX, blockY };
      }
    }
    // ここに到達するのは盤面がほぼ埋まっている場合のみ。それでも呼び出し元でINSERT→UNIQUE違反の実リトライに委ねるため、諦めずに1つ返す。
    return {
      blockX: Math.floor(Math.random() * GRID_BLOCKS),
      blockY: Math.floor(Math.random() * GRID_BLOCKS),
    };
  }
}
