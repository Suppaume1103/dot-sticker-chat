// ============================================================
// config/fieldConfig.ts — 広場の空間配置に関する定数（I21改, I23改, I25, I26）
// ============================================================

export const SPRITE_SIZE = 16; // ドット絵の一辺(px)
export const GUTTER = 16; // 絵と絵の最小余白(px)
export const CELL = SPRITE_SIZE + GUTTER; // = 32

export const DENSITY = 0.08; // 目標占有率
export const EXPECTED_N = 80; // お題あたり想定投稿数

export const MAX_TIER = 10;　// 最大表示ティア（I26: 4段階の閾値の最大値）
export const BLOCK_CELLS = MAX_TIER + 1; // = 11

// 要ブロック数(1000個)を正方形に敷き詰めるなら一辺は何ブロック必要かを計算。
export const GRID_BLOCKS = Math.ceil(Math.sqrt(EXPECTED_N / DENSITY)); // = 32
export const GRID_CELLS = GRID_BLOCKS * BLOCK_CELLS; // = 352

// 保存数 → 表示ティア（I25: サイズはDBに持たずコードで導出、I26: 4段階の閾値）
export function tierSize(saveCount: number): 1 | 2 | 4 | 10 {
  if (saveCount >= 50) return 10;
  if (saveCount >= 20) return 4;
  if (saveCount >= 5) return 2;
  return 1;
}
