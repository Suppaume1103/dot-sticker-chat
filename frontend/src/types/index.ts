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
  tier: 1 | 2 | 4 | 10;
}

export interface Message {
  id: string;
  senderId: string;
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
  kind: 'text' | 'sticker';
  body: string | null;
  stickerId: string | null;
  createdAt: string;
}

export interface HealthResponse {
  status: string;
}
