// ============================================================
// services/StickerSubmissionService.ts — お題への投稿処理
// 対応invariant: I19（1お題1人1枚・一発確定）
// ============================================================

import { PromptRepository } from "../repositories/PromptRepository";
import { PromptStateService } from "./PromptStateService";
import { StickerRepository } from "../repositories/StickerRepository";
import type { StickerWithSaveCount } from "../repositories/StickerRepository";
import { FieldPlacementService } from "./FieldPlacementService";
import { TierService } from "./TierService";
import type { Sticker } from "../entities/Sticker";

const PIXELS_LENGTH = 256; // 256要素、各要素は0〜15のパレットindex

// I19: 1お題1人1枚。既に投稿済みの場合はここで拒否する（一発確定・再投稿不可）。
export class PromptNotFoundError extends Error {
  constructor(promptId: string) {
    super(`prompt not found: ${promptId}`);
    this.name = "PromptNotFoundError";
  }
}

// I10: opens〜closesの時間窓外での投稿はここで拒否する。
export class PromptNotDrawableError extends Error {
  constructor(promptId: string) {
    super(`prompt is not drawable now: ${promptId}`);
    this.name = "PromptNotDrawableError";
  }
}

// I19: 1お題1人1枚。既に投稿済みの場合はここで拒否する（一発確定・再投稿不可）。
export class AlreadySubmittedError extends Error {
  constructor(promptId: string) {
    super(`already submitted for prompt: ${promptId}`);
    this.name = "AlreadySubmittedError";
  }
}

// I19: pixelsは256要素の配列である必要がある。違反時はここで拒否する。
export class InvalidPixelsError extends Error {
  constructor() {
    super(`pixels must be an array of length ${PIXELS_LENGTH}`);
    this.name = "InvalidPixelsError";
  }
}

// GET /field のレスポンス形。保存数に加えて表示ティアも付与する。
export type StickerWithTier = StickerWithSaveCount & { tier: 1 | 2 | 4 | 10 };

// I19: 投稿処理の責務は「投稿可能かの判断」と「空きブロックの割当・INSERT」まで。
export class StickerSubmissionService {
  private promptRepository = new PromptRepository();
  private promptStateService = new PromptStateService();
  private stickerRepository = new StickerRepository();
  private fieldPlacementService = new FieldPlacementService();
  private tierService = new TierService();

  async submit(promptId: string, creatorId: string, pixels: number[]): Promise<Sticker> {
    const prompt = await this.promptRepository.findById(promptId);
    if (!prompt) {
      throw new PromptNotFoundError(promptId);
    }

    // I10: 在室チェックはSocketGateway未実装のため未対応（PromptStateServiceのコメント参照）。
    // 現時点では時間窓（opens〜closes）のみ判定する。
    if (!this.promptStateService.canDraw(prompt)) {
      throw new PromptNotDrawableError(promptId);
    }

    // I19: 事前チェック。ここで弾いても、直後に他リクエストが割り込む余地はあるが、
    // 最終防壁はDBのUNIQUE(prompt_id, creator_id)制約（insert時に例外として現れる）。
    const existing = await this.stickerRepository.findOwnSubmission(promptId, creatorId);
    if (existing) {
      throw new AlreadySubmittedError(promptId);
    }

    if (!Array.isArray(pixels) || pixels.length !== PIXELS_LENGTH) {
      throw new InvalidPixelsError();
    }

    // ここから先の「空きブロックを選んでINSERT、UNIQUE(block)違反ならリトライ」は
    // FieldPlacementServiceの責務（I21改, I23改）。
    return this.fieldPlacementService.assignAndInsert(promptId, creatorId, pixels);
  }

  async getOwnSubmission(promptId: string, creatorId: string): Promise<Sticker | null> {
    return this.stickerRepository.findOwnSubmission(promptId, creatorId);
  }

  async getFieldData(promptId: string): Promise<StickerWithTier[]> {
    const stickers = await this.stickerRepository.findByPromptWithSaveCounts(promptId);
    return stickers.map((sticker) => ({
      ...sticker,
      tier: this.tierService.resolveTier(sticker.saveCount),
    }));
  }
}
