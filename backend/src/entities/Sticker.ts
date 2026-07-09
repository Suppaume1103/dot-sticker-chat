// ============================================================
// entities/Sticker.ts — stickersテーブルの1行を表すデータの型
// ============================================================

export interface Sticker {
  id: string;
  promptId: string;
  creatorId: string;
  pixels: number[]; // 256要素、各要素は0〜15のパレットindex
  blockX: number;
  blockY: number;
  createdAt: Date;
}
