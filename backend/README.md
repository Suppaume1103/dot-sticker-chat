# backend

Node.js + TypeScript + Express + Socket.IO + PostgreSQL

## セットアップ

```bash
npm init -y
npm install express cors dotenv jsonwebtoken node-cron pg socket.io
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken @types/node-cron @types/pg
```

`tsconfig.json`、`.env`（`DATABASE_URL`等）は各自で用意する。

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

- `../db/schema.sql` — DBスキーマ（流し込み済み）
- `../docs/api_socket_design.md` — REST API / Socket.IOイベント設計
- `../docs/class_design.md` — 各クラスの責務・依存関係
