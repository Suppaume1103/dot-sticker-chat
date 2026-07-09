// ============================================================
// services/ChatService.ts — オープンチャットの送受信
// 対応invariant: I15（送信済みメッセージは、送信者がその後保存を手放しても・失効しても変わらない）
// ============================================================

import { MessageRepository } from "../repositories/MessageRepository";
import { StickerRepository } from "../repositories/StickerRepository";
import { UserStickerRepository } from "../repositories/UserStickerRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import type { Message } from "../entities/Message";

// bodyが空文字/未指定のテキストメッセージを送ろうとした場合。
export class EmptyMessageError extends Error {
  constructor() {
    super("message body must not be empty");
    this.name = "EmptyMessageError";
  }
}

// 指定されたsticker_idが存在しない場合。
export class StickerNotFoundError extends Error {
  constructor(stickerId: string) {
    super(`sticker not found: ${stickerId}`);
    this.name = "StickerNotFoundError";
  }
}

// 送信者がそのシールを所持していない（user_stickersに存在しない）場合。
export class StickerNotOwnedError extends Error {
  constructor(stickerId: string) {
    super(`sticker not owned: ${stickerId}`);
    this.name = "StickerNotOwnedError";
  }
}

// I18と同じ考え方：チャット送信もお題のexpires_atを過ぎたら不可。
export class StickerExpiredError extends Error {
  constructor(stickerId: string) {
    super(`sticker expired: ${stickerId}`);
    this.name = "StickerExpiredError";
  }
}

// GET /api/messages のlimitクエリに指定できる上限。無制限に取得されるのを防ぐ。
const MAX_LIMIT = 100;

export class ChatService {
  private messageRepository = new MessageRepository();
  private stickerRepository = new StickerRepository();
  private userStickerRepository = new UserStickerRepository();
  private promptRepository = new PromptRepository();

  async sendText(senderId: string, body: string | undefined): Promise<Message> {
    // trim()で前後の空白だけのメッセージも空扱いにする
    if (!body || body.trim().length === 0) {
      throw new EmptyMessageError();
    }
    return this.messageRepository.insert(senderId, "text", body, null);
  }

  // I15: 検証するのは「今この時点で送信してよいか」だけ。
  // 一度送信されたmessages行は、この後sticker/user_stickers/collectionsがどう変化しても不変のまま残る。
  async sendSticker(senderId: string, stickerId: string): Promise<Message> {
    const sticker = await this.stickerRepository.findById(stickerId);
    if (!sticker) {
      throw new StickerNotFoundError(stickerId);
    }

    // 「今使えるトレイに入っているもの」＝user_stickersに所持記録があること
    const owned = await this.userStickerRepository.findByUserAndSticker(senderId, stickerId);
    if (!owned) {
      throw new StickerNotOwnedError(stickerId);
    }

    // I18: チャットでの利用はexpiresまで可能（closesは無関係）
    const prompt = await this.promptRepository.findById(sticker.promptId);
    if (!prompt || new Date() > prompt.expiresAt) {
      throw new StickerExpiredError(stickerId);
    }

    return this.messageRepository.insert(senderId, "sticker", null, stickerId);
  }

  async getRecent(before: Date | null, limit: number): Promise<Message[]> {
    const clampedLimit = Math.min(limit, MAX_LIMIT);
    return this.messageRepository.findRecent(before, clampedLimit);
  }
}
