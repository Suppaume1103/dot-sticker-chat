// 空間配置に関わる定数・tierSize()はbackend/src/config/fieldConfig.tsが正本。
// frontend/backendで値がずれると広場の配置・サイズが食い違うため、二重管理せずここから再エクスポートする。
import {
  SPRITE_SIZE,
  GUTTER,
  CELL,
  DENSITY,
  EXPECTED_N,
  MAX_TIER,
  BLOCK_CELLS,
  GRID_BLOCKS,
  GRID_CELLS,
  tierSize,
  type Tier,
} from "../../../backend/src/config/fieldConfig";

export {
  SPRITE_SIZE,
  GUTTER,
  CELL,
  DENSITY,
  EXPECTED_N,
  MAX_TIER,
  BLOCK_CELLS,
  GRID_BLOCKS,
  GRID_CELLS,
  tierSize,
  type Tier,
};

// 広場に固定表示されるUI要素（THEMEバナー・在室バッジ・カウントダウン・±ズーム）と
// シールが重ならないための予約領域。表示専用の定数なのでbackendには不要

// 中央THEMEバナーの占有領域（フィールド中心 left:50% top:46% からの半径・px）。
// バナー実寸(約120×55px)に余白GUTTER分の見切れ防止マージンを足した値
export const THEME_BANNER_HALF_WIDTH = 60 + GUTTER;
export const THEME_BANNER_HALF_HEIGHT = 28 + GUTTER;

// 上部バー（在室バッジ・カウントダウン・±ズーム。実測最大高56px）を、
// 横幅いっぱいに帯として予約する。GUTTER分の余白を足した値
export const TOP_HUD_HEIGHT = 56 + 10 + GUTTER; // 10=上端オフセット

// THEMEバナー（フィールド中心）の位置比率。広場画面の初期表示位置合わせにも使うためexportする
export const THEME_BANNER_CENTER_X_RATIO = 0.5;
export const THEME_BANNER_CENTER_Y_RATIO = 0.46;

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

  const centerX = fieldWidth * THEME_BANNER_CENTER_X_RATIO;
  const centerY = fieldHeight * THEME_BANNER_CENTER_Y_RATIO;
  const overlapsThemeBanner =
    left < centerX + THEME_BANNER_HALF_WIDTH &&
    right > centerX - THEME_BANNER_HALF_WIDTH &&
    top < centerY + THEME_BANNER_HALF_HEIGHT &&
    bottom > centerY - THEME_BANNER_HALF_HEIGHT;

  return overlapsTopHud || overlapsThemeBanner;
}

// ブロック座標(blockX, blockY)を画面上のpx座標に変換する
export function blockToPixel(blockX: number, blockY: number): { left: number; top: number } {
  return { left: blockX * CELL, top: blockY * CELL };
}

// 予約領域と重なる場合、重ならなくなるまでtopをCELL単位で下にずらす
export function avoidReservedZone(
  left: number,
  top: number,
  size: number,
  fieldWidth: number,
  fieldHeight: number,
): { left: number; top: number } {
  let adjustedTop = top;
  while (overlapsReservedZone(left, adjustedTop, size, fieldWidth, fieldHeight)) {
    adjustedTop += CELL;
  }
  return { left, top: adjustedTop };
}
