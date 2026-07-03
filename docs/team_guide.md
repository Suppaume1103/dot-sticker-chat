# はじめてのチーム開発ガイド

技術の話は他のdocsに任せて、ここは「進め方」だけをまとめる。初めてのチーム開発だと、詰まる理由は技術力より進め方が9割だ。

---

## 心構え：完璧を目指さない、動くものを毎日1個増やす

12日しかない。最初から綺麗なコードを書こうとすると手が止まる。**まず動く→あとで直す**の順でいい。今日書いたコードが明日の自分に「なんだこれ」と思われても、動いていれば勝ちだ。汚くても動くコードは、綺麗で動かないコードより100倍価値がある。

逆に、1つの機能に丸1日詰まったら、それは「自分の実力不足」じゃなく「設計や情報が足りてないサイン」であることが多い。1〜2時間で解決しなければ、抱え込まずに次のどれかをやる。

- `docs/`の該当ファイルを読み直す(design_summary.md, api_socket_design.md, class_design.md)
- Claude Codeに「ここで詰まってる、原因を一緒に探して」と投げる
- 相手に「これ詰まってる」と一言送る

---

## 毎日の進め方（型を決めておく）

別々の場所で作業する以上、型を決めておかないと同期が取れなくなる。この順番を毎回繰り返す。

```
1. 作業開始前に git pull
2. 今日やることを1〜3個、相手に一言送る（LINEでもDiscordでも何でもいい）
3. 作業する（1機能=1コミットくらいの粒度で進める）
4. 動いたらこまめに git push
5. 作業終了時、今日できたこと・明日やることを相手に一言送る
```

3番の「動いたらpush」が特に大事だ。1日の終わりにまとめてpushじゃなく、**何か1つ動いたらその都度push**する。pushすればRenderが自動で再デプロイするので、相手もそのタイミングで動作確認できる。通信が止まったまま丸一日が過ぎると気づいたときに大きな手戻りになる。

---

## エディタ環境の開き方

VSCodeでこのプロジェクトをどう開くか。初めてだと地味に迷うところなので先に結論を書いておく。

### 結論：backend/ と frontend/ を、それぞれ別ウィンドウで開く

ルート（`dot-sticker-chat/`）をまるごと1つのウィンドウで開かない。

```
VSCode ウィンドウ1: dot-sticker-chat/backend/ を開く
VSCode ウィンドウ2: dot-sticker-chat/frontend/ を開く
```

Macなら `code backend/` `code frontend/` のようにターミナルから開くか、VSCodeの「フォルダを開く」でそれぞれのディレクトリを直接指定する。

### なぜルートを開かないほうがいいか

`backend/` と `frontend/` は、それぞれ独立した`package.json`・`tsconfig.json`・`node_modules`を持つ別プロジェクトだ。ルートをまとめて1つのウィンドウで開くと、こういうことが起きやすい。

- **TypeScriptの補完・エラー検出が混同する。** 片方のプロジェクトの型エラーが、もう片方の画面のエディタ上にも出てくるような紛らわしい状態になりやすい
- **ファイル検索（Cmd+P / Ctrl+P）が両方混ざる。** 「このファイルどこだっけ」でbackendとfrontendの同名っぽいファイルが両方出てきて迷う
- **ターミナルの初期ディレクトリがルートになる。** `npm run dev`のたびに`cd backend`か`cd frontend`を打つ手間が毎回発生する

別ウィンドウで開けば、この3つが全部解消する。開いた瞬間から`npm run dev`がそのまま打てるし、補完も自分が今触っているプロジェクトだけを見てくれる。

Claude Codeのセッションも「backend/とfrontend/で別々に起動する」と決めてある。VSCodeのウィンドウ分けをこれと揃えておくと、頭の切り替えが単純になる。「今このウィンドウにいる＝今このClaude Codeセッションで作業している」という対応が崩れない。

### docs/ を見たいとき

別ウィンドウで開くと、`docs/`フォルダはどちらのウィンドウからも直接は見えない。困ったときは以下のどちらかでいい。

- Finder（Mac）/ エクスプローラー（Windows）から`docs/`内のファイルを直接開く
- 必要なときだけ一時的にルート（`dot-sticker-chat/`）をVSCodeで開いて`docs/`を読み、読み終わったら閉じる

普段の実装作業はbackend/frontendの各ウィンドウで進め、設計を確認したいときだけルートを覗く、くらいの使い分けでいい。

### Gitはどちらの開き方でも問題ない

`git`はコマンドを打った場所から親ディレクトリを遡って`.git`を探す。だから`backend/`の中でターミナルを開いて`git pull`や`git push`を打っても、ちゃんとリポジトリ全体（`dot-sticker-chat/`）に対して正しく効く。「backend/だけしかgitが効かないのでは」と心配しなくていい。

VSCodeの左側にあるSource Control（ソース管理）パネルも、backend/を開いたウィンドウならbackend/配下の変更を、frontend/を開いたウィンドウならfrontend/配下の変更を、それぞれ問題なく表示・コミットできる。

---

## DBの扱い方（ローカル / Render）

別々のパソコンで作業する以上、バック担当のパソコンが常に起動してるとは限らない。なので本番相当のDB・APIサーバーはRender（クラウド）に置き、ローカルは開発中の作業台として使い分ける。Renderを選んだのは、Railwayと違って**クレジットカード登録が不要**だから（その代わりAPIサーバーは15分アクセスが無いとスリープする。デモ直前は一度アクセスして起こしておく）。

### 役割分担

```
ローカルのPostgreSQL  → バック担当だけが使う。新機能を試すときの作業台
Render上のPostgreSQL  → 実際にフロントと繋いで動作確認する場所（常時起動、ただしAPIサーバーはスリープあり）
```

フロント担当はローカルDBを直接触ることはない。フロントが繋ぐのは常にAPIサーバーのURLで、`.env`の`VITE_API_BASE_URL`をRenderが発行するURLに向けておけばいい。

### Renderのセットアップ手順

1. https://render.com でGitHubアカウントを使って登録する（カード登録不要）
2. 「New +」→「PostgreSQL」でDBサービスを立てる
3. **Internal Database URL と External Database URL の2つが発行される。用途を間違えない。**
   - ローカルの`psql`から直接繋ぐとき（`schema.sql`を流す、テーブル確認する等）→ **External**
   - Render上にデプロイしたAPIサーバーの環境変数 → **Internal**（同じRenderネットワーク内なので速く、これで統一する）
4. `db/schema.sql`を流す（ローカルから）
   ```
   psql "<RenderのExternal Database URL>" -f db/schema.sql
   ```
5. 「New +」→「Web Service」で`dot-sticker-chat`リポジトリを連携する
   - **Root Directoryを`backend`に指定する**（モノレポなのでここを間違えるとビルドが通らない。`npm error enoent ... package.json`のようなエラーが出たら大抵ここ）
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
6. 環境変数を設定する（Web Serviceの「Environment」タブ、または使い回すなら「Environment Group」を作って紐付ける）
   - `DATABASE_URL` → 手順3のInternal Database URL
   - `JWT_SECRET` → 適当な文字列
   - `CLIENT_ORIGIN` → フロントの本番URL
   - `PORT` → Renderが自動割り当てするので基本触らなくていい
7. デプロイが成功すると `https://xxxx.onrender.com` のようなURLが発行される。これがAPIの本番URL。`https://xxxx.onrender.com/api/health` にアクセスして `{"ok":true}` が返れば成功
8. `frontend/.env` の `VITE_API_BASE_URL` をこのURLに書き換える

### デプロイ前に確認すること（今回つまずいた点）

Renderは`backend/package.json`を見つけてビルドしようとする。だから**`backend/`に`package.json`が存在していないとビルドが失敗する**。ディレクトリ構成（`.gitkeep`だけの空フォルダ）を作っただけでは`npm install`が通らないので、実際に

```
cd backend
npm init -y
npm install express cors dotenv jsonwebtoken node-cron pg socket.io
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken @types/node-cron @types/pg
```

を実行して`package.json`を作ってから、Renderのデプロイを試す。`npm init -y`直後の`package.json`は`scripts`欄が空（`test`しか無い）なので、`dev`/`build`/`start`を手動かClaude Codeで追記する必要がある。

### git pushで自動的に再デプロイされる

Renderをリポジトリと連携しておけば、`main`にpushするたびに自動で再デプロイされる。今までの「pushしたらお互い動作確認する」という進め方とそのまま噛み合う。

### バック担当が普段の開発で気をつけること

- 新しいAPIを実装している最中は、まずローカルDBで動作確認する。いきなりRender（本番相当）で試すと、壊れたときにフロント担当の作業も止まってしまう
- ローカルで動いたら`git push`する。Renderが自動で拾って再デプロイする
- `db/schema.sql`を変更したときは、ローカルとRenderの両方に同じ変更を反映する（片方だけ更新すると食い違いが起きる）

---

## Gitで最低限これだけ覚えればいい

複雑なブランチ運用はしない。基本は`main`に直接コミットでいい（前提はdocs/design_summary.mdの日程・分担の通り）。

```bash
git pull                          # 作業前に必ず
git add .
git commit -m "feat: 投稿APIの実装"   # 短くていい。何をしたかが分かれば十分
git push
```

### コンフリクトが起きたら

バックとフロントでディレクトリが分かれてるので、基本的にコンフリクトはほぼ起きない。もし起きたら焦らず、エラーメッセージに出てくるファイル名をそのままClaude Codeに見せて「これどう直せばいい」と聞けばいい。git自体の複雑な操作を覚える必要はない。

---

## 詰まったときの順番

技術的なエラーに当たったとき、闇雲に触らずこの順で進める。

1. **エラーメッセージを最後まで読む**。特に一番下の行。日本語じゃなくても、単語だけ拾えば大体何が起きてるか分かる（`not found`＝見つからない、`undefined`＝値が無い、等）
2. **直前に何を変えたか思い出す**。動いてたのに壊れたなら、直前の変更が原因のことがほとんど
3. **小さく再現する**。複雑な画面全体で確認せず、一番小さい単位（1つのAPI、1つの関数）だけを単体で試す
4. **Claude Codeに聞く**。エラーメッセージ全文と、何をしようとしていたかをそのまま伝える。中途半端に要約せず、エラーを丸ごとコピペした方が正確に助けてくれる
5. それでも1〜2時間動かなければ、相手に聞く。「自分で解決すべき」と抱え込まない。教え合う方が結果的に速い

---

## Claude Codeへの頼み方のコツ

- **1回の指示は小さく**。「バックエンド全部作って」ではなく「StickerRepositoryだけ実装して」くらいの粒度
- **完成したら型チェックやビルドを実行させて確認する**。「実装して」で終わらせず「実装して、型チェックが通ることを確認して」まで頼む
- **`docs/`のファイル名を指示に含める**。「`docs/class_design.md`のSaveServiceの仕様通りに実装して」のように、参照先を具体的に伝えると迷いが減る
- 生成されたコードは**必ず自分の目で一度見る**。分からない部分があれば「このコードのこの部分、何をしてるか説明して」と聞いていい。理解せず貼るだけだと、後で自分が直せなくなる

---

## このスタックでよくあるつまずき

### CORSエラーが出る
バックエンドの`.env`の`CLIENT_ORIGIN`が、フロントが実際に動いているURLと一致していないと起きる。ローカルなら`http://localhost:5173`、別の場所からならフロント側のURLを正確に合わせる。

### 「.envが見つからない」「接続できない」
`.env`は`.gitignore`に入っていてGitHubには上がらない。だから相手のマシンでは自動的には手に入らない。`.env.example`を見ながら、各自で自分の`.env`を作る必要がある（DATABASE_URLやVITE_API_BASE_URLなど）。

### 型エラーの意味が分からない
TypeScriptの型エラーは長くて怖く見えるが、大体は「渡した値の形が期待と違う」だけ。エラーの一番上に書かれてる型と、実際に渡してる値の型を見比べれば大抵分かる。分からなければ全文をClaude Codeに投げていい。

### PostgreSQLに繋がらない
`DATABASE_URL`のユーザー名・パスワード・ポート番号のどれかが間違っていることが多い。前に`netprofinal`ユーザーで文字コードのトラブルがあったように、環境ごとのクセが出やすい箇所。エラーメッセージに`password`や`encoding`が出ていれば、その単語で何が起きてるか見当がつく。

### `\dt`やデータの日本語が文字化けする
DBやファイル側の問題ではなく、大抵は**PowerShell側の表示エンコーディングがShift-JISのまま**なのが原因。原因の切り分け方は「見出し（テーブル一覧、名前など）だけ化けているか」「データの中身（保存した日本語）まで化けているか」で分かる。前者はほぼ確実に表示だけの問題で、DBの中身は無事。

その場のセッションだけ直すなら接続前に一度だけ実行する。
```powershell
$env:PGCLIENTENCODING="UTF8"
```

恒久的に直したいなら、`$PROFILE`に以下を追記して保存し、PowerShellを開き直す。
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

ただし他の授業でShift-JIS前提の環境を使っている場合は、恒久設定にはせずセッションごとの一時設定（`$env:`の方）で使い分けるのが安全。

### RenderのInternal/External URLを間違える
ローカルの`psql`から直接繋ぐときは**External**、Render上のAPIサーバーの環境変数には**Internal**を使う。取り違えると接続できない。詳しくは「DBの扱い方」セクション参照。

### `backend/`にpackage.jsonが無くてRenderのビルドが失敗する
`npm error enoent ... package.json`が出たら、単純に`npm init`をまだ実行していない可能性が高い。ディレクトリ構成（フォルダと`.gitkeep`）だけでは`npm install`は動かない。「DBの扱い方」セクションの「デプロイ前に確認すること」を参照。

---

## 締切から逆算する意識

7/15提出、今は実装の真っ只中。**新機能を追加するより、今あるものを確実に動かす方が優先度が高い**フェーズに入りつつある。「あれも作りたい」が浮かんでも、まず`docs/design_summary.md`の確定スコープに立ち返る。スコープ外の機能は、締切後にやりたければやればいい。

不安になったら、この4つのファイルのどれかに答えがある。

- `docs/design_summary.md` — 何を作るか、何を作らないか
- `docs/api_socket_design.md` — API・イベントの仕様
- `docs/class_design.md` — どのクラスが何をするか
- `CLAUDE.md`（各ディレクトリ） — 実装時に守るべきルール
