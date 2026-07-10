// TODO: ChatStore/TrayStore実装後に置き換える一時モックデータ（見た目確認用）
import type { Message } from '../types';
import { MOCK_STICKERS } from './plazaMock';

export const MOCK_SELF_ID = '999';

export interface MockChatMessage extends Message {
  senderName: string;
  expired?: boolean;
}

export const MOCK_MESSAGES: MockChatMessage[] = [
  {
    id: '1',
    senderId: '201',
    senderName: '□□',
    kind: 'text',
    body: 'これ送るね',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    senderId: '201',
    senderName: '□□',
    kind: 'sticker',
    stickerId: MOCK_STICKERS[2].id,
    createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    senderId: MOCK_SELF_ID,
    senderName: '自分',
    kind: 'text',
    body: 'かわいい！保存した',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    senderId: '202',
    senderName: '〇〇',
    kind: 'text',
    body: '図鑑埋まってきた',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    senderId: '203',
    senderName: '△△',
    kind: 'sticker',
    stickerId: '9999', // 失効済み・存在しないsticker想定
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    expired: true,
  },
];

// シールピッカー(画面6)：いま使える札のみ（所持・期限内・自作含む）
export const MOCK_TRAY = MOCK_STICKERS.slice(0, 8);
