# frontend

React + TypeScript（Vite想定）

## 現状（2026-07-03時点）

`src/` はディレクトリ構成のみ、`package.json`もまだ存在しない（`npm create vite`を実行していない）。実装はClaude Codeに、`docs/class_design.md` と `docs/api_socket_design.md` を参照させながら進める方針。まずは疎通確認（バックエンドの`/api/health`を叩いて表示するだけ）から始める。

## セットアップ

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom socket.io-client
```

`.env`に`VITE_API_BASE_URL`（バックエンドのURL。Renderが発行するURル、`https://xxxx.onrender.com`の形）を設定する。バックエンドはRenderの無料枠でスリープすることがあるので、繋がらないときは一度直接アクセスして起こしてから再試行する。

## ディレクトリ構成（設計済み。詳細は docs/class_design.md 参照）

```
src/
  api/          ApiClient（REST APIの窓口）
  socket/        SocketClient（Socket.IOの窓口）
  stores/         AuthStore, PlazaStore, ChatStore, TrayStore
  canvas/          PlazaCanvasRenderer（描画専用、Reactに依存しない）
  types/            型定義
  config/            fieldConfig.ts（backendと値を一致させること）
  screens/            画面（Storeを読むだけ）
  components/          TabBar, PlazaCanvas 等
```

## 参照ドキュメント

- `../docs/wireframe.html` — 全8面のワイヤーフレーム
- `../docs/api_socket_design.md` — REST API / Socket.IOイベント設計
- `../docs/class_design.md` — 各クラスの責務・依存関係
- `../docs/team_guide.md` — Renderのセットアップ手順・つまずきやすい点

