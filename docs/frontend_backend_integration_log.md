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

## Phase 3: 積み残し解消・追加バグ修正

Phase 2完了後、残っていた積み残し（DrawScreen未接続・表示名解決・パン/ズーム未実装）を順に解消した。さらにその過程・その後のユーザー確認で新たなバグが2件見つかり、あわせて対応した。

### DrawScreen実データ化

- `plazaMock.MOCK_PROMPT`依存を除去し、`usePlaza()`で実際の現在お題（テーマ・締切・promptId）を取得するよう変更
- 投稿先を実際の`prompt.id`に、残り時間表示も`PlazaScreen.tsx`と同じ`formatCountdown`ロジックで実装
- エラー表示を固定文言から`ApiError`ベースの実メッセージに変更
- 古い認証まわりのTODOコメントを削除（Phase 1で解消済みと判明）

**見つけて直したバグ：広場画面を経由せず直接`/draw`に入ると投稿が常に失敗する**
I10（描画には広場への在室=`field:join`が必要）により、`PlazaScreen`を経由せず`/draw`へ直接遷移すると在室登録がされないまま投稿しようとして失敗する。`DrawScreen`自体でも`joinPlazaField`/`leavePlazaField`を呼ぶよう対応した。

修正後、`plazaMock.ts`はどこからも参照されなくなったため削除した。

### 表示名（display_name）のAPI埋め込み対応

積み残し3（表示名解決の欠如）に対応。「別APIで一括取得」ではなく「既存クエリにJOINして埋め込む」方式を採用（Phase 2dの`expiresAt`追加と同じパターン）。

- `MessageRepository.insert`/`findRecent`のSQLに`users`とのJOINを追加し、`senderDisplayName`を埋め込む（`insert`はCTEで1クエリのまま実現）
- `StickerRepository.findByIdWithSaveCount`にも同様のJOINを追加し、`creatorDisplayName`を埋め込む
- `ChatScreen.tsx`/`StickerDetailScreen.tsx`のID直接表示を表示名表示に置き換え
- 対象はチャットの送信者名・シール詳細の作者名の2箇所のみ（図鑑・広場は元々ID/名前を表示していないため対象外＝YAGNI）

### チャットメッセージが1文字ずつ縦積みになるバグ修正

`.msg`（flexコンテナ）内でメッセージ本体を包むラッパー`<div>`がflexアイテムとして扱われる際、中の`.bub`が持つ`max-width: 70%`のパーセンテージ計算がflexアイテムのintrinsicサイズ計算時に解決できず、日本語テキスト（文字単位で改行可能）の特性と相まって、ラッパー幅が1文字分まで縮んでしまっていた。`max-width`をコンテインブロックに依存しない`min(70vw, 320px)`に変更して解決した。

### 広場フィールドのパン・ズーム実装（積み残し4の解消）

自前実装（追加npm依存なし）。ドラッグ（pointer events）でパン、ホイール/ピンチでズーム。ズームボタン（+/−）のUIは削除。

- `.field`（ビューポート）の直下に、シールのみを内包する`.field-canvas`（`transform: translate() scale()`）を新設。THEMEバナー・在室バッジ・カウントダウン・「描く」ボタンは`.field-canvas`の外に残し、パン・ズームの影響を受けないよう画面固定にした
- 初期表示は`pan=(0,0), zoom=1`とし、既存の`avoidReservedZone`ロジック・見た目に回帰が起きないようにした

**見つけて直したバグ1：ピンチズームがscaleを更新しなかった**
合成イベントでのテスト中、2本目の指の`pointerdown`で`setPointerCapture`が`NotFoundError`を投げ、以降のポインタ登録処理が止まっていた。`try-catch`で囲み、capture失敗時もMapへの登録は継続するよう修正。

**見つけて直したバグ2（ユーザー確認で判明）：「描く」ボタン・シールのクリックが効かなくなった**
パン・ズーム実装で`.field`全体に`setPointerCapture`を仕込んだ副作用で、その内側にある`<Link>`（「描く」ボタン、各シールへのリンク）をクリックしても、後続のクリックイベントが`.field`側にリダイレクトされてしまい、画面遷移が発生しなくなっていた。`handlePointerDown`内で、クリック対象が`<a>`要素（またはその子孫）の場合はpointer capture自体をスキップするよう修正した。

### 設定画面の未実装ボタン修正

`SettingsScreen.tsx`がPhase 1時点の`MOCK_USER`のまま放置されており、「ログアウト」「表示名・ユーザーID」「アバター」「このアプリについて」はいずれもクリックハンドラーの無い静的`<div>`だった（新規の壊れではなく元々未実装）。

- ログアウト：`AuthStore.logout()`を呼ぶよう実装（`RequireAuth`が自動的に`/login`へリダイレクトするため、明示的な`navigate`は不要）
- 表示名・ユーザーID編集：その場モーダルで実装。`AuthStore`に`updateDisplayName()`を新設し、`apiClient.updateMe()`呼び出しとuser state更新をStore側に集約。ユーザーID(`handle`)はbackendに変更APIが無いため表示のみ
- アバター：`Avatar`コンポーネントは`seed`から自動生成される仕組みで、DBに`avatar`列自体が無く変更機能が存在しないため行を削除
- このアプリについて：対応するサブ画面がwireframeの8画面にも含まれておらずスコープ外のため削除

### PixelEditorCanvasのタッチ非対応バグ修正（ユーザー確認で判明）

スマートフォンでは「描く」ボタンは押せるが、キャンバス上のドラッグでは描けず、マス目に個別タップしないと描けないという報告があった。原因は`PixelEditorCanvas.tsx`が`onMouseDown`/`onMouseEnter`というマウス専用イベントのみで実装されており、タッチデバイスの指ドラッグには反応しない作りだったため。

Pointer Events（マウス・タッチ・ペンを統一的に扱えるAPI）ベースに書き換え、`document.elementFromPoint()`で「今カーソル/指が乗っているセル」を毎回判定する方式に変更した。タッチは最初に触れた要素へ暗黙的にpointer captureされる仕様があるため、単純に各セルへ`onPointerEnter`を付けるだけでは対応できず、座標から直接セルを判定する実装が必要だった。

### 検証

各項目とも、typecheck/lint通過後、ブラウザで実際にログインして動作確認した。特にパン・ズーム関連のバグは、`evaluate_script`で合成PointerEvent/WheelEventを`dispatchEvent`し、DOM上のtransform値やコンソールエラーを直接確認する手法で検証した（実ブラウザの物理操作に近づけるため、`mouseenter`単体ではなく`mouseout`→`mouseover`のペアで発火させる必要があるなど、合成イベント特有の癖を踏まえた）。

### 図鑑未反映バグ修正 + 自作シールのチャット送信対応（ユーザー確認で判明）

「描いたドット絵が図鑑に登録されておらず、チャット内での使用が出来ない」という報告を受け、原因を調査したところ2つの問題があった。

**見つけて直したバグ：投稿成功後、図鑑「描いた」タブ・トレイが画面遷移しても反映されない**
`DrawScreen.tsx`の`handleSubmit`が投稿成功後に`ZukanStore.refreshZukan()`/`TrayStore.refreshTray()`を呼んでいなかった。`ZukanStore`/`TrayStore`はどちらもアプリ起動時（モジュールロード時）に一度だけデータを取得する設計のため、ログイン中に新しく投稿しても画面遷移だけでは古いデータのまま表示され続けていた。`StickerDetailScreen.tsx`の保存成功時には既にこの対応が入っていたが、`DrawScreen.tsx`の投稿成功時には漏れていた。投稿成功時にも両方の`refresh*()`を呼ぶよう修正した。

**仕様の穴：自作シールがチャットで送れない**
チャットで送れる「トレイ」（`user_stickers`テーブル）は`SaveService.save()`（＝保存操作）でのみレコードが作られるが、`SaveService`は自作シールの保存を`SelfSaveNotAllowedError`で明確に禁止している。結果、自作シールは`user_stickers`に一切入らず、`ChatService`の所持チェック（`UserStickerRepository.findByUserAndSticker`）にも引っかからず送信できなかった。ユーザーに確認したところ「自作でも送れるようにすべき」という判断だったため、以下の対応を行った。

- `user_stickers.acquired_via`のDB CHECK制約に`'created'`を追加（`'plaza' | 'chat'` → `'plaza' | 'chat' | 'created'`）
- `UserStickerRepository`にトランザクション不要の新規INSERT用メソッド`insertForCreator(userId, stickerId)`を追加
- `StickerSubmissionService.submit()`内、投稿成功直後（Socket配信の前）に`insertForCreator`を呼び、作者自身のトレイへ自動登録するようにした
- `TrayStore`/`ChatService`側のクエリ・所持チェックロジックは無変更（既存の`user_stickers`ベースのロジックがそのまま自作シールにも機能する設計にした）

### 検証

2人の独立ユーザーで検証した。1人目が投稿→**画面遷移せず**同一セッション内で図鑑「描いた」タブを開き即座に反映されることを確認。トレイ・チャットのシールピッカーにも自作シールが選択肢として現れ、実際に送信できることを確認した。検証用テストユーザー・シールはDBから削除して後片付けした。

### 広場保存（via=plaza）が失敗するバグ修正（ユーザー確認で判明）

「描画可能期間に他ユーザーのドット絵を保存できるはずが出来ていない」という報告を受け、原因を調査した。

**見つけて直したバグ：シールをクリックして詳細画面に遷移すると在室から外れ、保存がSaveWindowClosedErrorで失敗する**
backendのI10invariant（`PromptStateService.canPlazaSave`）は、広場保存に「時間窓内（opens〜closes）」に加えて「その広場に在室していること（`SocketGateway.isPresent`）」も要求する。在室は`field:join`/`field:leave`イベントで管理されており、`PlazaScreen.tsx`が画面表示中のみ`joinPlazaField(prompt.id)`を呼び、アンマウント時に`leavePlazaField`を呼ぶ設計になっていた。広場でシールをクリックして`StickerDetailScreen`（`/sticker/:id?via=plaza`）へ遷移すると、`PlazaScreen`がアンマウントされ在室から外れてしまい、その状態で「保存」を押すと保存が失敗していた。

これは`DrawScreen.tsx`で以前発生していたのと同種の問題（本セクション冒頭のバグと同じ「画面遷移で在室が切れる」パターン）で、`StickerDetailScreen.tsx`側だけ対応が漏れていた。`sticker`取得後、`via === 'plaza'`の場合に限り`joinPlazaField(sticker.promptId)`/`leavePlazaField`を呼ぶ`useEffect`を追加して解決した（`via === 'chat'`はI18により在室不問のため対象外）。

### 検証

2つの独立ブラウザセッション（ユーザーA・ユーザーB）で検証した。Aが投稿し、Bが広場画面からそのシールをクリックして詳細画面へ遷移、「保存」を押して「保存済み ✓」に変わることを確認した。URLを直接`/sticker/:id?via=plaza`で開いた場合（広場非経由）でも同様に保存できることを想定した設計になっている。検証用テストユーザー・シールはDBから削除して後片付けした。

## 既知の積み残し

設計上の既知の制約(意図的に対応しない/後回し)

1. AuthStoreのトークン設定タイミング
DrawScreenに残っていた古いTODOコメントは削除済み。実際にはPhase 1時点で`AuthStore`がログイン時に`apiClient.setToken()`を呼んでおり、解消済みと確認した。

Phase 2・Phase 3を通して完了

Plaza・Chat・Tray・図鑑・シール詳細・お絵描き・設定の全画面が実データ・リアルタイム更新で動作するようになっている。表示名解決・パン/ズームも実装済み。