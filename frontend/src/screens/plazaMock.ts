// TODO: PlazaStore実装後に置き換える一時モックデータ（見た目確認用）
import type { FieldSticker, Prompt } from '../types';

const HERO_TEMPLATE = [
  '................',
  '................',
  '....77777770....',
  '...7777777770...',
  '..777777777770..',
  '..777dd777770...',
  '..777dd777770...',
  '...7777777770...',
  '....77777770....',
  '.....777770.....',
  '......7770.......',
  '......66..........',
  '.....6666........',
  '....66..66.......',
  '................',
  '................',
];

const CHAR_TO_INDEX: Record<string, number> = {
  '.': 1,
  '7': 7,
  d: 13,
  6: 6,
  0: 0,
};

function templateToPixels(template: string[]): number[] {
  const pixels: number[] = [];
  for (const row of template) {
    for (const ch of row.padEnd(16, '.').slice(0, 16)) {
      pixels.push(CHAR_TO_INDEX[ch] ?? 1);
    }
  }
  return pixels;
}

export const MOCK_PROMPT: Prompt = {
  id: 7,
  theme: '夏のいきもの',
  opensAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
};

export interface MockField {
  saveCount: number;
  tier: 1 | 2 | 4 | 10;
  left: number;
  top: number;
  pixels?: number[];
  creatorName?: string;
}

export const MOCK_STICKERS: (FieldSticker & MockField)[] = [
  {
    id: 1,
    promptId: 7,
    creatorId: 100,
    blockX: 3,
    blockY: 8,
    createdAt: '',
    pixels: templateToPixels(HERO_TEMPLATE),
    saveCount: 62,
    tier: 10,
    left: 90,
    top: 380,
    creatorName: '〇〇 さく',
  },
  {
    id: 2,
    promptId: 7,
    creatorId: 101,
    blockX: 1,
    blockY: 3,
    createdAt: '',
    pixels: [],
    saveCount: 31,
    tier: 4,
    left: 40,
    top: 110,
  },
  {
    id: 3,
    promptId: 7,
    creatorId: 102,
    blockX: 6,
    blockY: 4,
    createdAt: '',
    pixels: [],
    saveCount: 8,
    tier: 2,
    left: 215,
    top: 120,
  },
  {
    id: 4,
    promptId: 7,
    creatorId: 103,
    blockX: 7,
    blockY: 7,
    createdAt: '',
    pixels: [],
    saveCount: 12,
    tier: 2,
    left: 235,
    top: 235,
  },
  { id: 5, promptId: 7, creatorId: 104, blockX: 6, blockY: 9, createdAt: '', pixels: [], saveCount: 0, tier: 1, left: 210, top: 330 },
  { id: 6, promptId: 7, creatorId: 105, blockX: 8, blockY: 8, createdAt: '', pixels: [], saveCount: 2, tier: 1, left: 250, top: 300 },
  { id: 7, promptId: 7, creatorId: 106, blockX: 2, blockY: 9, createdAt: '', pixels: [], saveCount: 1, tier: 1, left: 70, top: 330 },
  { id: 8, promptId: 7, creatorId: 107, blockX: 1, blockY: 6, createdAt: '', pixels: [], saveCount: 3, tier: 1, left: 30, top: 230 },
  { id: 9, promptId: 7, creatorId: 108, blockX: 8, blockY: 5, createdAt: '', pixels: [], saveCount: 0, tier: 1, left: 255, top: 175 },
];
