// ============================================================
// repositories/PromptRepository.ts — promptsテーブルへのSQLクエリだけを持つクラス
// ============================================================

import { pool } from "../db/pool";
import { Prompt } from "../entities/Prompt";

// DBの行（スネークケース・timestamp文字列）をPromptインスタンスに詰め替える
// 共通処理。3つのメソッドで同じ変換をするので、関数として切り出している。
// 引数の型 `any` は本来避けたいが、pgの行オブジェクトの型は実行するSQLによって変わるため、ここでは受け取ってすぐPromptに変換する用途に限定して使う。
function toPrompt(row: {
  id: string;
  theme: string;
  opens_at: Date;
  closes_at: Date;
  expires_at: Date;
}): Prompt {
  return new Prompt(row.id, row.theme, row.opens_at, row.closes_at, row.expires_at);
}

export class PromptRepository {
  // 「現在アクティブなお題、無ければ次に開くお題」を1件返す。
  // SQLの ORDER BY + LIMIT だけで自然に1件に絞り込む（repository層のルール順守）。
  // WHERE expires_at >= now(): まだ失効していないお題だけに絞る
  //   （すでに失効したお題は対象外＝I9の「失効後は使用不可」を反映）
  // ORDER BY opens_at ASC: 開始が一番近い（＝今開いている、または次に開く）順
  // LIMIT 1: 1件だけ取得
  async findCurrent(): Promise<Prompt | null> {
    const result = await pool.query(
      "SELECT id, theme, opens_at, closes_at, expires_at FROM prompts WHERE expires_at >= now() ORDER BY opens_at ASC LIMIT 1",
    );

    if (result.rows.length === 0) {
      return null;
    }
    return toPrompt(result.rows[0]);
  }

  async findById(id: string): Promise<Prompt | null> {
    const result = await pool.query(
      "SELECT id, theme, opens_at, closes_at, expires_at FROM prompts WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return toPrompt(result.rows[0]);
  }

  // 将来のPromptScheduler（node-cronジョブ）が「状態が変わったお題が無いか」を
  // 定期的にチェックするために使う想定。直近作成された10件を返す。
  async findRecentForScheduler(): Promise<Prompt[]> {
    const result = await pool.query(
      "SELECT id, theme, opens_at, closes_at, expires_at FROM prompts ORDER BY created_at DESC LIMIT 10",
    );

    return result.rows.map(toPrompt);
  }

  // PromptSchedulerが現行お題の失効時に次お題を自動生成するためのINSERT。
  async create(theme: string, opensAt: Date, closesAt: Date, expiresAt: Date): Promise<Prompt> {
    const result = await pool.query(
      "INSERT INTO prompts (theme, opens_at, closes_at, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, theme, opens_at, closes_at, expires_at",
      [theme, opensAt, closesAt, expiresAt],
    );
    return toPrompt(result.rows[0]);
  }
}
