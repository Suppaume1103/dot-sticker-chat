# backend

Node.js + TypeScript + Express + Socket.IO + PostgreSQL

セットアップは `README.md` を参照。

## 依存の向き（絶対に守る）

```
routes/  →  services/  →  repositories/  →  PostgreSQL
```

- `routes/` は `services/` を呼ぶだけの薄い層。ここに業務ロジックを書かない
- `services/` は `repositories/` を呼ぶ。invariant（未保有チェック、時間窓判定など）はすべてここに書く
- **`repositories/` にif文で業務判断を書かない。** SQLクエリだけを持つ。「保存していいか」のような判断はrepositoryの仕事ではない
- 依存の逆流は1つだけ許可：`services/` から `infrastructure/SocketGateway` 経由でクライアントへの配信。書き込み成功後に一方的に飛ばし、応答を待たない

## invariantを実装するとき

`../docs/design_summary.md` にI1〜I26のinvariant定義、`../docs/class_design.md` に各クラスがどのinvariantを担当するかの対応表がある。Service層のクラスを実装・修正する前に必ず該当箇所を読み、対応するinvariant番号をコードコメントに残す。

例：SaveServiceの実装を頼まれたら、I1・I5・I6・I7・I9・I18を満たしているか確認してから書く。

## ブロック割当のUNIQUE制約は最終防壁として使う

`FieldPlacementService` の空きブロック割当は、事前チェック（SELECTで空きを確認）だけに頼らない。同時投稿の競合で必ずすり抜ける。`INSERT` を投げて `UNIQUE(prompt_id, block_x, block_y)` 違反を捕まえ、座標を変えてリトライする実装にする。事前チェックのみの実装は不可。

## 参照ドキュメント

- `../docs/api_socket_design.md` — 各エンドポイント・Socket.IOイベントの仕様
- `../docs/class_design.md` — クラスの責務・依存関係
- `../db/schema.sql` — テーブル定義とUNIQUE制約
