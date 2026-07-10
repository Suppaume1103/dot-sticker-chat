# frontend×backend 結合 実装日誌

DOT STICKER CHAT の frontend と backend を実際に繋ぎ込んだ作業の記録。`backend/docs/implementation_log.md`はbackend単体の実装（Step 1〜12）を記録したもので、こちらはそれとは別に、frontendのモック除去・実データ接続・Socket.IOリアルタイム連携の作業を記録する。

frontend側の作業は5つのフェーズ（Phase 2a〜2e）に分割して進めた。各フェーズの前に、backendの実際のAPI/Socket.IOイベント仕様をコードから調査し、想定と食い違う点があればその都度計画を修正した。

---

## 前提: Phase 1（認証まわりの土台）

Phase 2着手前に、以下を実装済みだった。

- `ApiClient.ts`: 認証tokenの保持、backendのレスポンス封筒（`{user}`, `{sticker}`など）をunwrapする薄いラッパー
- `AuthStore.ts`: モジュールレベルsingleton + `useSyncExternalStore`によるStoreパターン（`ThemeStore.ts`の既存パターンを踏襲）
- `LoginScreen.tsx`: サインアップ/ログインの簡易フォーム
- `SocketClient.ts`: Socket.IOクライアントのラッパー
- `RequireAuth`（`App.tsx`内）: 未ログイン時に`/login`へリダイレクト

この時点でbackendのid型（`BIGSERIAL`→文字列）とfrontendの型（`number`だった）の不一致があり、`types/index.ts`の全id関連フィールドを`string`に統一する対応も合わせて行った。

---

## Phase 2a: PlazaStore新設 + PlazaScreen/PlazaField実データ化

### やったこと

- `stores/PlazaStore.ts`新設：現在のお題・状態・シール一覧・在室人数をSocket.IO（`sticker:new`, `sticker:save_count_updated`, `prompt:state_changed`, `field:presence`）で更新するStore
- `config/fieldConfig.ts`に`blockToPixel`（ブロック座標→px座標変換）と`avoidReservedZone`（THEMEバナー・HUD帯との重なり回避）を追加
- `PlazaScreen.tsx`/`PlazaField.tsx`のモック（`plazaMock.ts`）依存を除去

### 見つけて直したバグ

1. **Socket接続とStoreの購読登録の順序が壊れていた**
   当初`App.tsx`の`useEffect`で`socketClient.connect()`を呼ぶ設計にしていたが、Reactのeffect実行順序（子コンポーネントのeffectが親より先に走る）により、`PlazaStore`の`socketClient.on(...)`購読登録が親の接続処理より先に走ってしまい、在室人数が常に0人のままになる不具合があった。`AuthStore`のtoken確定（`login`/`signup`/`restore`）と同期して`socketClient.connect()`を呼ぶよう修正し、`App.tsx`側の`useEffect`は削除した。

2. **`SocketClient`のイベントリスナー登録がタイミング依存で失われる設計だった**
   `SocketClient.on()`が`this.socket?.on(...)`という実装になっており、`connect()`が呼ばれる前（`socket`が`null`）に`on()`が呼ばれると購読が黙って失敗する欠陥があった。`PlazaStore.ts`はimport時点で`socketClient.on(...)`を呼ぶため、import順序次第で購読が失われていた。`socket`インスタンス自体を常時生成（`autoConnect: false`）しておき、`connect()`/`disconnect()`は接続状態の切り替えのみを行う設計に直した。

### 検証

2ブラウザでログインし、在室人数のリアルタイム反映、シール投稿の即時反映、THEMEバナーとの重なり回避を確認した。

---

## Phase 2b: ChatStore新設 + ChatScreen実データ化

### やったこと

- `stores/ChatStore.ts`新設：メッセージ一覧の取得・送信・`message:new`購読
- `types/index.ts`に`RawMessagePayload`型を追加（backendの`message:new`実payloadは`body`/`stickerId`が`null`許容、`Message`型は`undefined`許容という食い違いを吸収するため）
- 自分の送信はAPIレスポンスで確定表示し、`message:new`受信時は同一idの重複を無視する設計にした（backendは送信者本人にもグローバルemitするため、素朴な楽観的更新だと二重表示になる）

### 検証

2ユーザーでテキスト送信の双方向リアルタイム同期、自分の発言の二重表示が起きないことを確認した。

---

## Phase 2c: TrayStore新設 + StickerPickerSheet実データ化

### やったこと

- `stores/TrayStore.ts`新設（`refreshTray()`をexportし、後続フェーズから再取得できるようにした）
- `ApiClient.getTray()`の戻り値型を実際のレスポンス形状（`acquiredVia`/`acquiredAt`付き）に合わせて修正
- `StickerPickerSheet.tsx`の説明文言「所持・期限内・自作含む」を、実際の仕様（`SaveService`が自作シールの保存を禁止しているため、trayに自作の未保存シールは含まれない）に合わせて「保存済み・期限内」に修正

---

## Phase 2d: 図鑑(ZukanScreen)実データ化

### 見つけた問題：backendが「失効」情報を返していなかった

`docs/design_summary.md`のI4「一度入手した作品は図鑑から消えない（失効しても）」の通り、図鑑は失効後も永続表示する仕様。しかし`CollectionQueryService.getCollected`/`getCreated`はどちらも期限判定を一切行っておらず、表示に必要な「失効しているか」の情報が無かった。

### やったこと（backend）

- `CollectionRepository.findCollectedByUser` / `StickerRepository.findByCreatorWithSaveCounts`のSQLに`prompts`とのJOINを追加し、`expires_at`を取得
- `CollectionQueryService`で`expiresAt <= now()`を比較し`expired: boolean`を算出するロジックを追加（repositoryはSQLのみ、判断はservice層という既存の層分離ルールに従った）

### やったこと（frontend）

- `stores/ZukanStore.ts`新設（`refreshZukan()`もexport）
- `ZukanScreen.tsx`のモック除去。あわせて、ヘッダーの「集めた N枚」がタブに関わらず常にモックの固定値を表示していたバグも修正

---

## Phase 2e: StickerDetailScreen実データ化 + 保存ボタン有効化

Phase 2の最終フェーズ。この時点でシール単体取得API・保存済み判定APIがbackendに存在しなかったため、backendにも手を入れた。

### やったこと（backend）

- `StickerRepository.findByIdWithSaveCount`を追加
- `SaveService.getDetail`を追加（保存数・tier・自作か・保存済みかをまとめて返す。保存済み判定は既存の`UserStickerRepository.findByUserAndSticker`を再利用し、新規クエリを増やさなかった）
- `GET /api/stickers/:id`を新設

### やったこと（frontend）

- `ApiClient.ts`に`ApiError`（HTTPステータスを保持する例外クラス）を新設し、`request()`が投げる例外をこれに統一。呼び出し側で`error.status === 409`のように分岐できるようにした
- `PlazaField.tsx`のLinkに`?via=plaza`、`ChatScreen.tsx`のシールバブルに`?via=chat`付きのLinkを追加（保存時に「広場経由か・チャット経由か」をbackendに伝える必要があるため）
- `StickerDetailScreen.tsx`を全面書き換え。保存済み(`saved`)・自作(`isMine`)の状態に応じてボタンの表示を切り替え、保存成功時（および409＝既に保存済みの場合）は`refreshTray()`/`refreshZukan()`を呼んでTray・図鑑に即時反映

### 見つけて直したバグ：チャットでのシール送信が常に400になっていた

`ApiClient.sendMessage()`がシール送信時に`{ stickerId }`（camelCase）をbodyに含めていたが、backendの`POST /api/messages`は`sticker_id`（snake_case）というキー名を期待していた。Phase 1で書かれたコードが一度も実在する保存済みシールで検証されておらず（Phase 2bの検証時はモック由来の存在しないIDを使っていたため、別の理由の400と誤認していた）、Phase 2eで初めて実在するシールを保存してからチャット送信を試したことで表面化した。`sendMessage`内でシール送信時のみ`sticker_id`キーに変換するよう修正した。

### 検証

シールを保存→「保存済み ✓」表示、図鑑への即時反映、自作シールの保存不可、重複保存(409)時に表示が壊れないこと、チャットのシールバブルから詳細画面への遷移、を一通り確認した。

---

## 全体を通して見つかったパターン

- **層をまたぐ食い違いは、レスポンスの実物を見るまで気づけない。** 型定義だけを見て「合っているはず」と判断すると、`ApiClient.getTray()`の戻り値型やDate/string・null/undefinedの不一致のように、実際にAPIを叩くまで気づかない食い違いが複数回あった。各フェーズで必ずcurl（または一時的なsocket.io-clientスクリプト）による実地検証を行い、レスポンスの実物を確認してから完了とした。
- **StoreパターンとSocket接続のライフサイクルは、初期化順序に注意が必要。** モジュールトップレベルで`socketClient.on(...)`を呼ぶ設計は簡潔だが、「いつ誰が接続するか」を決め打ちしないと、import順序に依存した見えにくいバグ（Phase 2aで発生）を生む。
- **モック時代のUI文言・挙動は、実データに繋いだ時点で仕様との整合性を見直す必要がある。** `StickerPickerSheet`の「自作含む」表記、図鑑の枚数表示バグなど、モックがそれらしく見えるように書かれていたせいで、実データ化するまで矛盾に気づかなかった箇所が複数あった。

## 検証時の手順（共通）

各フェーズとも、以下の手順で動作確認した。

1. `npm run typecheck` / `npm run lint`（frontend, backend双方）
2. backend/frontendのdevサーバーを起動
3. 実データでの検証が必要な場合、一時的に`npm install --no-save socket.io-client`し、使い捨てのNode検証スクリプトでシール投稿・保存・field:joinなどを行う
4. ブラウザ（複数タブ/複数ユーザー）で実際の画面を操作して確認
5. 検証用パッケージ・スクリプト・DBのテストデータ（`handle`にフェーズ名を含むプレフィックスを付けて識別）を削除して後片付け

## 既知の積み残し(実装中に見つけたもの)

1. DrawScreen.tsxの実データ未接続
Phase 1時点からのTODOで、いまだにplazaMock.MOCK_PROMPTにお題ID・テーマを依存しています。実際には「現在アクティブなお題」に対して投稿する必要があるため、PlazaStore(またはapiClient.getCurrentPrompt())に接続する必要があります。これが直らないと、ユーザーが実際に「描く」ボタンから投稿しても現在のお題と紐付かず、シールが正しく反映されません。実質唯一の「モックが残っている」機能欠陥です。

2. AuthStoreのトークン設定タイミング
DrawScreenのTODOコメントに「認証実装後、AuthStoreのトークンをApiClientへ設定してから呼ぶ」とありましたが、これはPhase 1で解消済みのはず(AuthStoreがログイン時にapiClient.setToken()を呼ぶため)。念のため実装済みかは確認していません。

設計上の既知の制約(意図的に対応しない/後回し)

3. 表示名解決の欠如
チャット・シール詳細画面で、相手ユーザーの名前がsenderId/creatorId(数字のID)のまま表示されます。ユーザー名を引く仕組み(APIまたはキャッシュ)がbackendに無いため。デモとして許容範囲かはユーザー判断。

4. PlazaField.tsxのパン・ズーム未実装
広場のシールは実際には非常に広い仮想キャンバス上に配置されるため、ブロック座標によっては画面外に描画されます。ズームボタン(+/−)はUIとして存在しますが機能していません。これは元々「Phase 3」として別枠で計画していた項目です。

Phase 2全体としては完了

Plaza・Chat・Tray・図鑑・シール詳細の5画面すべてが実データ・リアルタイム更新で動作するようになっています。