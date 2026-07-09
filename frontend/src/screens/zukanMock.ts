// TODO: CollectionQueryService接続後に置き換える一時モックデータ（見た目確認用）
import { MOCK_STICKERS } from './plazaMock';

export interface ZukanCell {
  id: number;
  pixels?: number[];
  saveCount?: number;
  locked?: boolean; // 未入手
  expired?: boolean; // 失効（永続表示・保存数つき）
}

export const MOCK_COLLECTED: ZukanCell[] = [
  { id: 1, pixels: MOCK_STICKERS[0].pixels },
  { id: 2, pixels: [] },
  { id: 3, pixels: [], saveCount: 31 },
  { id: 4, pixels: [] },
  { id: 5, pixels: [] },
  { id: 6, pixels: [], expired: true },
  { id: 7, locked: true },
  { id: 8, pixels: [] },
  { id: 9, locked: true },
];

export const MOCK_CREATED: ZukanCell[] = MOCK_STICKERS.map((s) => ({
  id: s.id,
  pixels: s.pixels,
  saveCount: s.saveCount,
}));
