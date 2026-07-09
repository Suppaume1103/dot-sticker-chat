// ============================================================
// entities/Message.ts — チャットメッセージのデータ型
// ============================================================

export interface Message {
  id: string;
  senderId: string;
  kind: "text" | "sticker"; // kindは"text"か"sticker"のどちらか
  body: string | null; // bodyはkind='text'のときだけ値を持つ。'sticker'のときはnull。
  stickerId: string | null; // stickerIdはkind='sticker'のときだけ値を持つ。'text'のときはnull。
  createdAt: Date;
}
