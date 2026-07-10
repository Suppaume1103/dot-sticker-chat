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

// 広場に固定表示されるUI要素（THEMEバナー・在室バッジ・カウントダウン・±ズーム）と
// シールが重ならないための予約領域。表示専用の定数なのでbackendには不要

// 中央THEMEバナーの占有領域（フィールド中心 left:50% top:46% からの半径・px）。
// バナー実寸(約120×55px)に余白GUTTER分の見切れ防止マージンを足した値
export const THEME_BANNER_HALF_WIDTH = 60 + GUTTER;
export const THEME_BANNER_HALF_HEIGHT = 28 + GUTTER;

// 上部バー（在室バッジ・カウントダウン・±ズーム。実測最大高56px）を、
// 横幅いっぱいに帯として予約する。GUTTER分の余白を足した値
export const TOP_HUD_HEIGHT = 56 + 10 + GUTTER; // 10=上端オフセット

// シール(left, top, size)が広場の固定UI要素の予約領域と重なるかを判定する
export function overlapsReservedZone(
  left: number,
  top: number,
  size: number,
  fieldWidth: number,
  fieldHeight: number,
): boolean {
  const right = left + size;
  const bottom = top + size;

  const overlapsTopHud = top < TOP_HUD_HEIGHT;

  const centerX = fieldWidth * 0.5;
  const centerY = fieldHeight * 0.46;
  const overlapsThemeBanner =
    left < centerX + THEME_BANNER_HALF_WIDTH &&
    right > centerX - THEME_BANNER_HALF_WIDTH &&
    top < centerY + THEME_BANNER_HALF_HEIGHT &&
    bottom > centerY - THEME_BANNER_HALF_HEIGHT;

  return overlapsTopHud || overlapsThemeBanner;
}
