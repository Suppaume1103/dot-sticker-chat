// ============================================================
// services/CollectionQueryService.ts — 図鑑（集めた/描いた/トレイ）の取得
// 対応invariant: I4, I5, I6, I7
// 既存repositoryのSELECT結果をそのまま返す。
// ============================================================

import { CollectionRepository } from "../repositories/CollectionRepository";
import type { CollectedSticker as CollectedStickerRow } from "../repositories/CollectionRepository";
import { StickerRepository } from "../repositories/StickerRepository";
import type { StickerWithSaveCountAndExpiry } from "../repositories/StickerRepository";
import { UserStickerRepository } from "../repositories/UserStickerRepository";
import type { TrayItem } from "../repositories/UserStickerRepository";
import { TierService } from "./TierService";
import type { Tier } from "../config/fieldConfig";

// 「集めた」一覧の1件分。repositoryが返す生のexpiresAtの代わりに、判断済みのexpiredを公開する。
export type CollectedSticker = Omit<CollectedStickerRow, "expiresAt"> & { expired: boolean };

// 「描いた」一覧の1件分。StickerWithSaveCountAndExpiryに、算出したtierを足し、生のexpiresAtをexpiredに置き換える。
export type CreatedSticker = Omit<StickerWithSaveCountAndExpiry, "expiresAt"> & {
  tier: Tier;
  expired: boolean;
};

// I8, I9: 期限はprompts.expires_atに集約されており、判断（過ぎているか）はservice層の責務。
function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export class CollectionQueryService {
  private collectionRepository = new CollectionRepository();
  private stickerRepository = new StickerRepository();
  private userStickerRepository = new UserStickerRepository();
  private tierService = new TierService();

  // I4: got_normal=trueのcollections行がそのまま「集めた」一覧になる（失効後も消えない＝永続表示）
  async getCollected(userId: string): Promise<CollectedSticker[]> {
    const rows = await this.collectionRepository.findCollectedByUser(userId);
    return rows.map(({ expiresAt, ...rest }) => ({
      ...rest,
      expired: isExpired(expiresAt),
    }));
  }

  // I5, I6, I7: 保存数はfindByCreatorWithSaveCounts側のSQLで既に正しく数えられているので、
  // ここではtier（I25, I26）とexpired（I8, I9）を付与するだけ。
  async getCreated(userId: string): Promise<CreatedSticker[]> {
    const stickers = await this.stickerRepository.findByCreatorWithSaveCounts(userId);
    return stickers.map(({ expiresAt, ...rest }) => ({
      ...rest,
      tier: this.tierService.resolveTier(rest.saveCount),
      expired: isExpired(expiresAt),
    }));
  }

  // I1: 期限内のもの（expires_at > now()）だけがtray repository側のWHERE句で絞られて返ってくる
  async getTray(userId: string): Promise<TrayItem[]> {
    return this.userStickerRepository.findTrayForUser(userId);
  }
}
