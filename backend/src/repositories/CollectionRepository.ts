// ============================================================
// repositories/CollectionRepository.ts — collectionsテーブルへのSQLクエリだけを持つクラス
// I4: append-only。DELETEは一切しない。
// ============================================================

import type { PoolClient } from "pg";

export class CollectionRepository {
  // --- ON CONFLICT ... DO UPDATE（upsert）について ---
  // PRIMARY KEY(user_id, sticker_id)が既に存在する行にINSERTしようとすると
  // 通常はエラーになるが、ON CONFLICTを付けると「衝突時にどうするか」を指定できる。
  // ここでは既存行があればgot_normalをtrueに更新するだけにし、無ければ新規INSERTする（＝どちらの場合も最終的にgot_normal=trueになる）。
  // I5: 主キーが(user_id, sticker_id)なので、同じユーザーが同じstickerに対して何度saveしても行は1つしか増えない＝寄与は必ず最大1。
  // I4: UPDATEはgot_normalをtrueにするだけで、一度trueになった行をfalseに戻したりDELETEしたりする経路はこのクラスに存在しない。
  async upsertGotNormal(client: PoolClient, userId: string, stickerId: string): Promise<void> {
    await client.query(
      `INSERT INTO collections (user_id, sticker_id, got_normal)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, sticker_id) DO UPDATE SET got_normal = true`,
      [userId, stickerId],
    );
  }
}
