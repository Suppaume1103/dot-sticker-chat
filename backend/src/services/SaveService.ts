// ============================================================
// services/SaveService.ts — 保存処理（広場・チャット共通）
// 対応invariant: I1, I5, I6, I7, I9, I18
// ============================================================

import { pool } from "../db/pool";
import { StickerRepository } from "../repositories/StickerRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import { UserStickerRepository } from "../repositories/UserStickerRepository";
import { CollectionRepository } from "../repositories/CollectionRepository";
import { TierService } from "./TierService";
import { socketGateway } from "../infrastructure/SocketGateway";
import type { UserSticker } from "../entities/UserSticker";

const PG_UNIQUE_VIOLATION = "23505"; // PostgreSQLのエラーコード。UNIQUE制約違反のときに返ってくる。

// PostgreSQLのエラーコードがUNIQUE制約違反かどうかを判定するユーティリティ関数。
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

// I1: stickerが存在しない場合。
export class StickerNotFoundError extends Error {
  constructor(stickerId: string) {
    super(`sticker not found: ${stickerId}`);
    this.name = "StickerNotFoundError";
  }
}

// 自作は保存不可（使用権はcreator_id判定）。
export class SelfSaveNotAllowedError extends Error {
  constructor() {
    super("cannot save your own sticker");
    this.name = "SelfSaveNotAllowedError";
  }
}

// I9: 広場保存はclosesまで。I18: チャット保存はexpiresまで。それぞれの窓を過ぎた場合。
export class SaveWindowClosedError extends Error {
  constructor(via: "plaza" | "chat") {
    super(`save window closed for via=${via}`);
    this.name = "SaveWindowClosedError";
  }
}

// I1: UNIQUE(user_id, sticker_id)違反。既にそのstickerを保存済み。
export class AlreadySavedError extends Error {
  constructor(stickerId: string) {
    super(`already saved: ${stickerId}`);
    this.name = "AlreadySavedError";
  }
}

// I1, I5, I6, I7, I9, I18: 保存処理（広場・チャット共通）。
export class SaveService {
  private stickerRepository = new StickerRepository();
  private promptRepository = new PromptRepository();
  private userStickerRepository = new UserStickerRepository();
  private collectionRepository = new CollectionRepository();
  private tierService = new TierService();

  async save(stickerId: string, userId: string, via: "plaza" | "chat"): Promise<UserSticker> {
    const sticker = await this.stickerRepository.findById(stickerId);
    if (!sticker) {
      throw new StickerNotFoundError(stickerId);
    }

    // 自作は保存不可（使用権はcreator_id判定）。
    if (sticker.creatorId === userId) {
      throw new SelfSaveNotAllowedError();
    }

    // I9: 広場保存はclosesまで。I18: チャット保存はexpiresまで。それぞれの窓を過ぎた場合。
    const prompt = await this.promptRepository.findById(sticker.promptId);
    if (!prompt) {
      throw new StickerNotFoundError(stickerId);
    }

    const now = new Date();
    // I9: 広場保存はclosesまで。I18: チャット保存はexpiresまで（closes後もexpiresまでは可能）。
    const deadline = via === "plaza" ? prompt.closesAt : prompt.expiresAt;
    if (now > deadline) {
      throw new SaveWindowClosedError(via);
    }

    // --- pool.connect() でトランザクション専用のclientを取得する ---
    // pool.query(...)は呼ぶたびに空いているコネクションを使うため、
    // 複数のクエリをまとめて1つのトランザクションにできない。
    // client.query(...)は同じコネクション上で実行され続けるので、
    // BEGIN〜COMMIT/ROLLBACKの間の操作がひとかたまりになる。
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // I1: UNIQUE(user_id, sticker_id)違反がここで起きうる（最終防壁）。
      const userSticker = await this.userStickerRepository.insert(client, userId, stickerId, via);

      // I5, I6: 保存数の真実はcollections.got_normal。ここをtrueにする。
      await this.collectionRepository.upsertGotNormal(client, userId, stickerId);

      // I25, I26: 配信するsaveCount/tierはCOMMIT前の同一トランザクション内で確定させる。
      const saveCount = await this.collectionRepository.countSaves(client, stickerId, sticker.creatorId);

      await client.query("COMMIT");

      // 書き込み成功後にのみ配信する。応答は待たない一方向配信。
      socketGateway.emitSaveCountUpdated({
        stickerId,
        saveCount,
        tier: this.tierService.resolveTier(saveCount),
      });

      return userSticker;
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new AlreadySavedError(stickerId);
      }
      throw error;
    } finally {
      // 接続リソースの解放のため、finallyでclientを解放して、コネクションプールに戻す
      client.release();
    }
  }
}
