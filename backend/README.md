# backend

Node.js + TypeScript + Express + Socket.IO + PostgreSQL

デプロイ先：Render（https://render.com）。DB・APIサーバーともRenderに置く。ローカルは開発中の作業台として使う（詳細は `../docs/team_guide.md` の「DBの扱い方」参照）。

## 現状（2026-07-03時点）

`src/` はディレクトリ構成のみで、実装コード（`index.ts` 等）はまだ存在しない。`npm init -y` で作った直後の `package.json` は `scripts` 欄が空（`test` のみ）なので、`dev`/`build`/`start`/`typecheck` を追記する必要がある。実装はClaude Codeに、`docs/class_design.md` と `docs/api_socket_design.md` を参照させながら進める方針。

## セットアップ

```bash
npm init -y
npm install express cors dotenv jsonwebtoken node-cron pg socket.io
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken @types/node-cron @types/pg
```

`npm init -y` の直後、`package.json` の `scripts` にこれを追記する（手動 or Claude Codeに依頼）。

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/index.js",
  "typecheck": "tsc --noEmit"
}
```

`tsconfig.json`、`.env`（`DATABASE_URL`等）は各自で用意する。`.env`の`DATABASE_URL`はローカルから繋ぐ場合、RenderのExternal Database URLを使う（Internal URLはRenderのネットワーク内専用で、ローカルからは繋がらない）。

## ディレクトリ構成（設計済み。詳細は docs/class_design.md 参照）

```
src/
  entities/         User, Prompt, Sticker, UserSticker, Collection, Message
  repositories/      テーブルごとのSQLクエリ（1テーブル1クラス）
  services/           業務ロジック・invariant検証
  infrastructure/      SocketGateway, PromptScheduler
  routes/                Expressルート（Serviceを呼ぶだけの薄い層）
  config/                 fieldConfig.ts
  db/                      PostgreSQL接続プール
  index.ts
```

## 参照ドキュメント

- `../db/schema.sql` — DBスキーマ（Renderに流し込み済み）
- `../docs/api_socket_design.md` — REST API / Socket.IOイベント設計
- `../docs/class_design.md` — 各クラスの責務・依存関係
- `../docs/team_guide.md` — Renderのセットアップ手順・つまずきやすい点

