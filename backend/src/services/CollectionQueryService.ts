// ============================================================
// services/CollectionQueryService.ts — 図鑑（集めた/描いた/トレイ）の取得
// 対応invariant: I4, I5, I6, I7
// 既存repositoryのSELECT結果をそのまま返す。
// ============================================================

import { CollectionRepository } from "../repositories/CollectionRepository";
import type { CollectedSticker } from "../repositories/CollectionRepository";
import { StickerRepository } from "../repositories/StickerRepository";
import type { StickerWithSaveCount } from "../repositories/StickerRepository";
import { UserStickerRepository } from "../repositories/UserStickerRepository";
import type { TrayItem } from "../repositories/UserStickerRepository";
import { TierService } from "./TierService";

// 「描いた」一覧の1件分。StickerWithSaveCountに、そこから算出したtierを足した交差型（&）。
export type CreatedSticker = StickerWithSaveCount & { tier: 1 | 2 | 4 | 10 };

export class CollectionQueryService {
  private collectionRepository = new CollectionRepository();
  private stickerRepository = new StickerRepository();
  private userStickerRepository = new UserStickerRepository();
  private tierService = new TierService();

  // I4: got_normal=trueのcollections行がそのまま「集めた」一覧になる
  async getCollected(userId: string): Promise<CollectedSticker[]> {
    return this.collectionRepository.findCollectedByUser(userId);
  }

  // I5, I6, I7: 保存数はfindByCreatorWithSaveCounts側のSQLで既に正しく数えられているので、
  // ここではtier（I25, I26）を付与するだけ。
  async getCreated(userId: string): Promise<CreatedSticker[]> {
    const stickers = await this.stickerRepository.findByCreatorWithSaveCounts(userId);
    return stickers.map((sticker) => ({
      ...sticker,
      tier: this.tierService.resolveTier(sticker.saveCount),
    }));
  }

  // I1: 期限内のもの（expires_at > now()）だけがtray repository側のWHERE句で絞られて返ってくる
  async getTray(userId: string): Promise<TrayItem[]> {
    return this.userStickerRepository.findTrayForUser(userId);
  }
}
