# frontend

React + TypeScript（Vite想定）

## セットアップ

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom socket.io-client
```

`.env`に`VITE_API_BASE_URL`（バックエンドのURL。別の場所で作業する日はngrok URLに切り替える）を設定する。

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
