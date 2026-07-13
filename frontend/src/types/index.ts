import type { Tier } from '../config/fieldConfig';

export type PromptState = 'active' | 'grace' | 'waiting';

// backendのidはpg(BIGSERIAL)がstringで返すため、フロント側もstringで統一する。
export interface User {
  id: string;
  handle: string;
  displayName: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  theme: string;
  opensAt: string;
  closesAt: string;
  expiresAt: string;
}

export interface Sticker {
  id: string;
  promptId: string;
  creatorId: string;
  pixels: number[]; // 256要素のパレットindex配列(0-15)
  blockX: number;
  blockY: number;
  createdAt: string;
}

export interface FieldSticker extends Sticker {
  saveCount: number;
  tier: Tier;
}

// シール詳細画面（GET /api/stickers/:id）専用。作者の表示名を追加。
export interface StickerDetail extends FieldSticker {
  creatorDisplayName: string;
}

// 自分が保存済み（プロフィールのtray）のシール。期限内(I1)のもののみ。
export interface TrayItem extends Sticker {
  acquiredVia: 'plaza' | 'chat' | 'created';
  acquiredAt: string;
}

// 図鑑「集めた」タブ用。失効しても消えない(I4)ため、expiredで見た目だけ変える。
export interface CollectedSticker extends Sticker {
  firstAcquiredAt: string;
  expired: boolean;
}

// 図鑑「描いた」タブ用。
export interface CreatedSticker extends Sticker {
  saveCount: number;
  tier: Tier;
  expired: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderDisplayName: string;
  kind: 'text' | 'sticker';
  body?: string;
  stickerId?: string;
  createdAt: string;
}

// backendのSocketGatewayが配信する message:new の生payload。
// null許容（Message型はundefined許容）で、createdAtはSocket.IOのJSONシリアライズによりISO文字列で届く。
export interface RawMessagePayload {
  id: string;
  senderId: string;
  senderDisplayName: string;
  kind: 'text' | 'sticker';
  body: string | null;
  stickerId: string | null;
  createdAt: string;
}

export interface HealthResponse {
  status: string;
}
