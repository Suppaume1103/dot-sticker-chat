// ============================================================
// entities/UserSticker.ts — user_stickersテーブルの1行を表すデータの型
// 「現在の所持＝使えるトレイ」を表す。
// ============================================================

export interface UserSticker {
  userId: string;
  stickerId: string;
  acquiredVia: "plaza" | "chat";
  acquiredAt: Date;
}
