// ============================================================
// services/TierService.ts — 保存数から表示ティアを算出する
// 対応invariant: I25, I26
// ============================================================

import { tierSize, type Tier } from "../config/fieldConfig";

export class TierService {
  // fieldConfig.tsのtierSize()に委譲するラッパー。
  resolveTier(saveCount: number): Tier {
    return tierSize(saveCount);
  }
}
