// ============================================================
// repositories/MessageRepository.ts — messagesテーブルへのSQLクエリだけを持つクラス
// ============================================================

import { pool } from "../db/pool";
import type { Message } from "../entities/Message";

function toMessage(row: {
  id: string;
  sender_id: string;
  kind: "text" | "sticker";
  body: string | null;
  sticker_id: string | null;
  created_at: Date;
}): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    kind: row.kind,
    body: row.body,
    stickerId: row.sticker_id,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  // kind='sticker'のときはbodyがnull、kind='text'のときはsticker_idがnullになる。
  async insert(
    senderId: string,
    kind: "text" | "sticker",
    body: string | null,
    stickerId: string | null,
  ): Promise<Message> {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, kind, body, sticker_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, kind, body, sticker_id, created_at`,
      [senderId, kind, body, stickerId],
    );
    return toMessage(result.rows[0]);
  }

  // ページング用。beforeを指定すると、その時刻より前のメッセージだけを返す。
  // beforeがnullのときは全件（limit件）が対象になる。
  async findRecent(before: Date | null, limit: number): Promise<Message[]> {
    const result = await pool.query(
      `SELECT id, sender_id, kind, body, sticker_id, created_at
       FROM messages
       WHERE ($1::timestamptz IS NULL OR created_at < $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [before, limit],
    );
    return result.rows.map(toMessage);
  }
}
