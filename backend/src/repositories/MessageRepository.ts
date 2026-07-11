// ============================================================
// repositories/MessageRepository.ts — messagesテーブルへのSQLクエリだけを持つクラス
// ============================================================

import { pool } from "../db/pool";
import type { Message } from "../entities/Message";

function toMessage(row: {
  id: string;
  sender_id: string;
  sender_display_name: string;
  kind: "text" | "sticker";
  body: string | null;
  sticker_id: string | null;
  created_at: Date;
}): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderDisplayName: row.sender_display_name,
    kind: row.kind,
    body: row.body,
    stickerId: row.sticker_id,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  // kind='sticker'のときはbodyがnull、kind='text'のときはsticker_idがnullになる。
  // 送信者の表示名も同じクエリ内でusersとJOINして埋め込む（INSERT...RETURNINGをCTEにして後段でJOIN）。
  async insert(
    senderId: string,
    kind: "text" | "sticker",
    body: string | null,
    stickerId: string | null,
  ): Promise<Message> {
    const result = await pool.query(
      `WITH inserted AS (
         INSERT INTO messages (sender_id, kind, body, sticker_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sender_id, kind, body, sticker_id, created_at
       )
       SELECT i.id, i.sender_id, i.kind, i.body, i.sticker_id, i.created_at, u.display_name AS sender_display_name
       FROM inserted i
       JOIN users u ON u.id = i.sender_id`,
      [senderId, kind, body, stickerId],
    );
    return toMessage(result.rows[0]);
  }

  // ページング用。beforeを指定すると、その時刻より前のメッセージだけを返す。
  // beforeがnullのときは全件（limit件）が対象になる。
  async findRecent(before: Date | null, limit: number): Promise<Message[]> {
    const result = await pool.query(
      `SELECT m.id, m.sender_id, m.kind, m.body, m.sticker_id, m.created_at, u.display_name AS sender_display_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE ($1::timestamptz IS NULL OR m.created_at < $1)
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [before, limit],
    );
    return result.rows.map(toMessage);
  }
}
