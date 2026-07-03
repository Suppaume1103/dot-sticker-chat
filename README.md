# DOT STICKER CHAT（仮称）

ネットワークプログラミング最終課題
提出期限：2026-07-15（水）

16×16ドット絵をお題に合わせて描き、共有広場とチャットで流通させる。時間で一斉失効し、保存数に応じて表示サイズが育つ。

デプロイ先：Render（DB・APIサーバーとも）。詳細は `docs/team_guide.md` の「DBの扱い方」参照。

## 構成

```
dot-sticker-chat/
  backend/     Node.js + TypeScript + Express + Socket.IO
  frontend/    React + TypeScript
  db/
    schema.sql  DBスキーマ（Renderに流し込み済み）
  docs/
    design_summary.md       確定仕様・invariant一覧
    api_socket_design.md    REST API / Socket.IOイベント設計
    class_design.md         クラス設計（責務・依存関係）
    wireframe.html          全8面のワイヤーフレーム（ブラウザで開く）
    team_guide.md           初めてのチーム開発ガイド（進め方・詰まったときの対処）
```

初めてのチーム開発なら、まず `docs/team_guide.md` を読むのを勧める。

## セットアップ

各ディレクトリのREADME（`backend/README.md`, `frontend/README.md`）を参照。

## 分担

- バックエンド：DB・API・Socket.IO・cron
- フロントエンド：広場Canvas・お絵描き・チャット・図鑑・設定

チャットは1対1・グループなし、ログイン中の全員が同じ場で話すオープンチャット1本。交換機能・キラ/ボンボン版は今回のスコープ外。
