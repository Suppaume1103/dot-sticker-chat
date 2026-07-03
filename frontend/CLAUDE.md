# frontend

React + TypeScript（Vite）

セットアップは `README.md` を参照。

## 実装の進め方

`src/`はまだ空、`package.json`も未作成。`npm create vite`でプロジェクトを立ち上げた後、`ApiClient`＋バックエンドの`/api/health`を叩いて表示するだけの最小`App.tsx`から始める。一気に全画面を実装させず、疎通確認→広場→お絵描き→チャット、の順に小さく進める。

## fieldConfig.ts はbackendと値を一致させる

`src/config/fieldConfig.ts` の `SPRITE_SIZE`, `GUTTER`, `CELL`, `DENSITY`, `EXPECTED_N`, `MAX_TIER`, `BLOCK_CELLS`, `GRID_BLOCKS`, `tierSize()` の閾値は、backend側の同名ファイルと完全に同じ値にする。どちらかだけ変更すると、広場の配置・サイズがフロントとバックで食い違う。値を変えるときは両方同時に直す。

## Storeがロジックを持つ。画面は持たない

- `screens/` と `components/` はStoreから受け取った値を表示するだけ。fetchやSocket.IOの購読を画面に直接書かない
- 通信は必ず `api/ApiClient` と `socket/SocketClient` を経由する。`fetch()` や `io()` を画面やStoreの外で直接呼ばない
- `canvas/PlazaCanvasRenderer` はReactに依存しない描画専用クラス。`PlazaStore` の状態を読むだけで、DOMやReactのライフサイクルを意識しない

## Socket.IOイベント名はbackendと1文字も違えない

`sticker:new`, `sticker:save_count_updated`, `prompt:state_changed`, `field:presence`, `message:new`。`../docs/api_socket_design.md` のイベント名をそのまま使う。タイポやキャメルケース/スネークケースの揺れで購読が効かなくなる事故が起きやすい。

## 参照ドキュメント

- `../docs/wireframe.html` — 全8面のワイヤーフレーム（ブラウザで開く）
- `../docs/api_socket_design.md` — REST API / Socket.IOイベントの仕様
- `../docs/class_design.md` — クラスの責務・依存関係
