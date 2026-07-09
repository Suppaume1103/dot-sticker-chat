export type PromptState = 'active' | 'grace' | 'waiting';

export interface User {
  id: number;
  handle: string;
  displayName: string;
  createdAt: string;
}

export interface Prompt {
  id: number;
  theme: string;
  opensAt: string;
  closesAt: string;
  expiresAt: string;
}

export interface Sticker {
  id: number;
  promptId: number;
  creatorId: number;
  pixels: number[]; // 256要素のパレットindex配列(0-15)
  blockX: number;
  blockY: number;
  createdAt: string;
}

export interface FieldSticker extends Sticker {
  saveCount: number;
  tier: 1 | 2 | 4 | 10;
}

export interface Message {
  id: number;
  senderId: number;
  kind: 'text' | 'sticker';
  body?: string;
  stickerId?: number;
  createdAt: string;
}

export interface HealthResponse {
  ok: boolean;
}
