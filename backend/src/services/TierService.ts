// ============================================================
// services/TierService.ts — 保存数から表示ティアを算出する
// 対応invariant: I25, I26
// ============================================================

import { tierSize } from "../config/fieldConfig";

export class TierService {
  // fieldConfig.tsのtierSize()に委譲するラッパー。
  resolveTier(saveCount: number): 1 | 2 | 4 | 10 {
    return tierSize(saveCount);
  }
}
