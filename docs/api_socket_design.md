# API / Socket.IO イベント設計

DOT STICKER CHAT
確定スコープ準拠：交換機能・グループチャット・1対1個別部屋は無し（オープンチャット1本）

---

## 設計方針

- **REST = 状態を変える操作の起点**（投稿・保存・送信など）。成功したらDBに書き込み、その後Socket.IOで全員に配信する
- **Socket.IO = 配信専用**。クライアントからのリクエストは基本REST、Socket.IOは「サーバ→全クライアント」の一方向が主。ただしチャット送信だけはSocket.IO起点でも良い（後述）
- 認証は簡易セッション（JWTかセッションCookie）。この設計書では `Authorization: Bearer <token>` を前提に書く

---

## REST API 一覧

### 認証

| Method | Path | 説明 |
|---|---|---|
| POST | `/api/auth/signup` | ハンドル・表示名で登録 |
| POST | `/api/auth/login` | ログイン、token発行 |
| POST | `/api/auth/logout` | ログアウト |
| GET  | `/api/auth/me` | 自分の情報取得 |

### お題・広場

| Method | Path | 説明 | invariant |
|---|---|---|---|
| GET | `/api/prompts/current` | 現在アクティブなお題（opens〜expires内で最新）を返す。無ければ次のお題予定を返す | I8, I9 |
| GET | `/api/prompts/:id/field` | そのお題の広場全データ（sticker一覧：block_x, block_y, pixels, creator_id, 保存数） | I21改, I22, I25 |
| GET | `/api/prompts/:id` | お題単体の情報（theme, opens_at, closes_at, expires_at） | I8 |

`GET /field` のレスポンスで保存数を含めるかティア(1/2/4/10)まで計算して返すかは実装判断。**フロントの負荷を下げるならサーバ側でtierSize()を計算して返す**のを推す（I25で決めた「サイズはコードで導出」の実装場所をサーバ側に寄せる）。

### 投稿（お絵描き）

| Method | Path | 説明 | invariant |
|---|---|---|---|
| POST | `/api/prompts/:id/stickers` | 投稿確定。body: `{ pixels: number[256] }`。サーバがblock_x/block_yをランダム空きブロックから割当 | I19, I21改 |
| GET | `/api/prompts/:id/stickers/me` | 自分が投稿済みか・投稿内容を取得（お絵描き画面のロック判定用） | I19 |

投稿APIは以下を満たす必要がある。

```
1. opens_at <= now() <= closes_at を確認（I10）
2. UNIQUE(prompt_id, creator_id) 違反 → 409（既に投稿済み、I19）
3. 空きブロックをランダムに取得 → INSERT
4. UNIQUE(prompt_id, block_x, block_y) 違反 → 空きブロック再取得してリトライ（数回まで）
5. 成功したらSocket.IOで sticker:new を配信
```

### 保存

| Method | Path | 説明 | invariant |
|---|---|---|---|
| POST | `/api/stickers/:id/save` | 保存（広場・チャット共通）。body: `{ via: 'plaza' \| 'chat' }` | I1, I5, I9, I18 |

```
1. via='plaza' の場合、closes_at > now() を確認（広場保存はclosesまで）
   via='chat'  の場合、expires_at > now() を確認（チャット保存はexpiresまで、I18）
2. creator_id === 自分 なら 400（自作は保存不要、使用権はcreator_id判定）
3. UNIQUE(user_id, sticker_id) 違反 → 409（既に保存済み、I1）
4. user_stickers に INSERT、collections.got_normal を true に更新（I5〜I7）
5. 成功したらSocket.IOで sticker:save_count_updated を配信
```

### チャット

| Method | Path | 説明 | invariant |
|---|---|---|---|
| GET | `/api/messages?before=&limit=` | 直近メッセージ取得（ページング） | I15 |
| POST | `/api/messages` | メッセージ送信。body: `{ kind: 'text'\|'sticker', body?, sticker_id? }` | I15 |

シール送信時、`sticker_id` は「今使えるトレイに入っているもの」に限定（サーバ側で `user_stickers` に存在するか・期限内かを確認）。

### 図鑑

| Method | Path | 説明 | invariant |
|---|---|---|---|
| GET | `/api/users/me/collections` | 「集めた」一覧。got_normal=trueのcollections | I4 |
| GET | `/api/users/me/created` | 「描いた」一覧。creator_id一致のstickers＋各保存数 | I4, I5, I6, I7 |
| GET | `/api/users/me/tray` | 「使える札」＝トレイ。user_stickers（期限内のみ） | I1 |

### 設定

| Method | Path | 説明 |
|---|---|---|
| PATCH | `/api/users/me` | display_name等の編集 |

---

## Socket.IO イベント一覧

接続時、クライアントは単一のチャンネル（room概念がないので実質グローバル）に自動join。広場も全員が同じお題の空間を見るので、`prompt:{id}` のチャンネルにjoinする形が扱いやすい。

### サーバ→クライアント（配信）

| Event | Payload | 発火タイミング | invariant |
|---|---|---|---|
| `prompt:state_changed` | `{ promptId, state: 'active'\|'grace'\|'waiting', prompt }` | node-cronがopens/closes/expiresを跨いだ瞬間 | I9, I10 |
| `sticker:new` | `{ stickerId, promptId, blockX, blockY, creatorId, pixels }` | 投稿成功時 | I19, I21改 |
| `sticker:save_count_updated` | `{ stickerId, saveCount, tier }` | 保存成功時。tierはサーバ側でtierSize()計算済み | I25, I26 |
| `field:presence` | `{ count }` | 在室ユーザー数が変化した時（join/leave） | I10 |
| `message:new` | `{ id, senderId, kind, body?, stickerId?, createdAt }` | チャット送信成功時 | I15 |

### クライアント→サーバ

room join/leaveの制御用に最小限だけ置く。

| Event | Payload | 説明 |
|---|---|---|
| `field:join` | `{ promptId }` | 広場画面を開いた時。在室カウントに加算 |
| `field:leave` | `{ promptId }` | 広場画面を閉じた時。在室カウントから減算 |

チャット送信・投稿・保存はRESTで統一し、Socket.IOはあくまで「結果の配信」に専念させる。これによりバリデーション・トランザクションの実装箇所がREST側1箇所に集約され、実装とデバッグが楽になる（Socket.IO越しに直接DB操作するルートを作らない）。

---

## node-cron ジョブ

| ジョブ | 頻度 | 処理 |
|---|---|---|
| お題状態チェック | 1分ごと（デモ時は調整可） | 現在時刻とprompts.opens_at/closes_at/expires_atを比較し、状態が変わっていたら`prompt:state_changed`を配信 |
| 次お題自動生成 | expires_at到達時 | 次のpromptsレコードを生成し、opens_atを設定（間隔はデモ用に短縮可能） |

デモ用に「1時間サイクルのお題を5分サイクルに短縮」のような設定をfieldConfig.ts的な定数ファイルに切り出しておくと、当日の見せ方調整が楽になる。

---

## 実装時の注意点（設計から実装への申し送り）

- 投稿・保存のブロック/未保有チェックは、**必ずDBのUNIQUE制約を最終防壁として頼る**。アプリ側の事前チェックだけに頼ると競合(同時押し)で破綻する。「事前チェック→INSERT→UNIQUE違反なら該当エラーコードを返す」の順で実装する
- Socket.IO配信は「DBへの書き込みが成功した後」に必ず行う。書き込み前や失敗時に配信すると、クライアントの表示とDBの実態がずれる
- `field:join`/`field:leave` は画面のマウント/アンマウントで確実に呼ぶ（在室数がズレる原因になりやすい）
