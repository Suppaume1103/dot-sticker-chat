# クラス設計

DOT STICKER CHAT

バックエンド・フロントエンドとも、以下の層構造でクラスを分ける。実装は各担当が行う。ここは責務と依存関係の設計のみを記す（コードは含まない）。

---

## 依存の向きのルール

依存は上から下への一方向だけにする。

```
Entry層（Routes / Socketハンドラ）
   ↓
Domain services（ビジネスロジック・invariant検証）
   ↓
Repositories（SQLクエリのみ）
   ↓
PostgreSQL
```

- Entry層はDomain servicesを呼ぶが、逆はない
- Domain servicesはRepositoriesを呼ぶが、Repositoriesは何も呼ばない
- **Repositoriesの中にif文で業務判断を書かない**。「保存していいか」「投稿済みか」のような判断は必ずServiceに置く。これを守るとinvariantの所在が常にService層に集まる
- 唯一の逆流は、Domain servicesからSocketGateway経由でのClientへの配信。書き込み成功後に一方的に飛ばすだけで、Client側の応答は待たない

---

## バックエンド

### Entities（データの形。振る舞いは最小限）

| クラス | 属性 | 備考 |
|---|---|---|
| `User` | id, handle, displayName, createdAt | |
| `Prompt` | id, theme, opensAt, closesAt, expiresAt | `resolveState(now)` でactive/grace/waitingを返す（I8, I9, I10, I18） |
| `Sticker` | id, promptId, creatorId, pixels, blockX, blockY, createdAt | |
| `UserSticker` | userId, stickerId, acquiredVia, acquiredAt | |
| `Collection` | userId, stickerId, gotNormal, firstAcquiredAt | |
| `Message` | id, senderId, kind, body, stickerId, createdAt | |

### Repositories（SQLクエリだけを持つ。業務判断はしない）

テーブル1つにつき1クラス。

| クラス | 主なメソッド |
|---|---|
| `UserRepository` | findById, findByHandle, create |
| `PromptRepository` | findCurrent, findById, findRecentForScheduler |
| `StickerRepository` | insert, findByPromptWithSaveCounts, findOwnSubmission, findCreatedByUserWithSaveCounts |
| `UserStickerRepository` | insert, findTrayForUser |
| `CollectionRepository` | upsertGotNormal, findCollectedByUser, countSaves |
| `MessageRepository` | findRecent, insert |

`insert`はUNIQUE制約違反をそのまま例外として投げる。ここで握りつぶさない。

### Domain Services（invariantを実際に守る層。設計の核）

| クラス | 対応invariant | 責務 |
|---|---|---|
| `AuthService` | - | signup, login, verifyToken |
| `FieldPlacementService` | I21改, I23改 | 空きブロックのランダム選択、UNIQUE違反時のリトライ |
| `TierService` | I25, I26 | 保存数→表示ティア(1/2/4/10)の算出 |
| `PromptStateService` | I8, I9, I10, I18 | 時間窓判定（canDraw, canPlazaSave, canChatSave） |
| `StickerSubmissionService` | I19 | 1お題1人1枚・一発確定の投稿処理 |
| `SaveService` | I1, I5, I6, I7, I9, I18 | 保存処理、保存数カウントの一貫性 |
| `ChatService` | I15 | オープンチャット送受信、スナップ保存 |
| `CollectionQueryService` | I4, I5, I6, I7 | 図鑑（集めた/描いた/トレイ）の取得 |

### Infrastructure

| クラス | 責務 |
|---|---|
| `SocketGateway` | emitStickerNew, emitSaveCountUpdated, emitPromptStateChanged, emitMessageNew, onFieldJoin/Leave（在室数管理） |
| `PromptScheduler` | node-cronジョブ。状態が変わった時だけemitする |

### ディレクトリ構成

```
backend/src/
  entities/        User.ts, Prompt.ts, Sticker.ts, UserSticker.ts, Collection.ts, Message.ts
  repositories/     UserRepository.ts, PromptRepository.ts, StickerRepository.ts,
                     UserStickerRepository.ts, CollectionRepository.ts, MessageRepository.ts
  services/          AuthService.ts, FieldPlacementService.ts, TierService.ts,
                      PromptStateService.ts, StickerSubmissionService.ts, SaveService.ts,
                      ChatService.ts, CollectionQueryService.ts
  infrastructure/     SocketGateway.ts, PromptScheduler.ts
  routes/              auth.ts, prompts.ts, stickers.ts, messages.ts, collections.ts
                        （Serviceを呼ぶだけの薄い層）
  config/               fieldConfig.ts
  db/                    pool.ts
  index.ts
```

---

## フロントエンド

| クラス | 役割 |
|---|---|
| `ApiClient` | REST APIの窓口。signup/login/getCurrentPrompt/getField/submitSticker/saveSticker/getMessages/sendMessage/getTray等 |
| `SocketClient` | Socket.IOの窓口。connect, joinField/leaveField, onStickerNew等の購読 |
| `AuthStore` | ログイン状態・自分の情報を保持。ApiClientに依存 |
| `PlazaStore` | 広場の状態（stickers, camera, presenceCount）を保持。ApiClientとSocketClientに依存 |
| `ChatStore` | チャットのメッセージ一覧を保持。ApiClientとSocketClientに依存 |
| `TrayStore` | 使える札の一覧を保持。ApiClientに依存 |
| `PlazaCanvasRenderer` | Canvas描画専用（Reactに依存しない）。setTransformでのズーム/パン、視野カリング、ティア別描画。PlazaStoreの状態を読む |

### ディレクトリ構成

```
frontend/src/
  api/          ApiClient.ts
  socket/        SocketClient.ts
  stores/         AuthStore.ts, PlazaStore.ts, ChatStore.ts, TrayStore.ts
  canvas/          PlazaCanvasRenderer.ts
  types/            index.ts
  config/            fieldConfig.ts （backendと値を一致させること）
  screens/            PlazaScreen.tsx, DrawScreen.tsx, ChatScreen.tsx, ZukanScreen.tsx, SettingsScreen.tsx
                       （Storeを読むだけ。ロジックを持たない）
  components/          TabBar.tsx, PlazaCanvas.tsx（PlazaCanvasRendererを呼ぶ薄いラッパー）
```

---

## バックエンドとフロントエンドの対応

| バック | フロント | 役割 |
|---|---|---|
| Repository | ApiClient | 通信・データ取得の窓口 |
| Domain Service | Store | 業務ロジック・状態の保持 |
| SocketGateway | SocketClient | リアルタイム配信/購読 |
| Entity | 型定義(interface) | データの形 |

API/Socket.IOイベント設計書（`api_socket_design.md`）のエンドポイント・イベント名と、`ApiClient`・`SocketClient`のメソッド名は1対1で対応させる想定。
