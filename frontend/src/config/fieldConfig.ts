export const SPRITE_SIZE = 16;
export const GUTTER = 16;
export const CELL = SPRITE_SIZE + GUTTER; // = 32

export const DENSITY = 0.08;
export const EXPECTED_N = 80;

export const MAX_TIER = 10;
export const BLOCK_CELLS = MAX_TIER + 1; // = 11

export const GRID_BLOCKS = Math.ceil(Math.sqrt(EXPECTED_N / DENSITY)); // = 32
export const GRID_CELLS = GRID_BLOCKS * BLOCK_CELLS; // = 352

export type Tier = 1 | 2 | 4 | 10;

export function tierSize(saveCount: number): Tier {
  if (saveCount >= 50) return 10;
  if (saveCount >= 20) return 4;
  if (saveCount >= 5) return 2;
  return 1;
}
