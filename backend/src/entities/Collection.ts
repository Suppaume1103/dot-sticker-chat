// ============================================================
// entities/Collection.ts — collectionsテーブルの1行を表すデータの型
// 「図鑑＝永続の入手台帳」を表す。保存数をここが担う（I4〜I7）。
// ============================================================

export interface Collection {
  userId: string;
  stickerId: string;
  gotNormal: boolean;
  firstAcquiredAt: Date;
}
