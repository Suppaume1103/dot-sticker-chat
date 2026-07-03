# DOT STICKER CHAT — 設計確定事項（DB / invariant）

ネットワークプログラミング最終課題
提出期限：2026-07-15（水）

対象スコープ：交換機能・キラ/ボンボン版・グループチャット・1対1個別部屋は今回**カット**。チャットは**ログイン中の全員が同じ場で話すオープンチャット1本**＋広場保存のみで進める。

---

## 技術スタック

- フロント：React + TypeScript
- バック：Node.js + TypeScript
- リアルタイム：Socket.IO
- DB：PostgreSQL
- 定期実行：node-cron

---

## 不変条件（Invariants）

enforcement層の凡例：
- **(A) DB構造制約** — UNIQUE / PK / FK / CHECK。物理的に拒否
- **(B) トランザクション** — 複数行をまたぐ整合性
- **(C) サーバ判定** — 時間窓・在室などアプリ側で判定

### 所持・重複

**I1. 1人は同じ作品を2枚以上持てない（未保有のみ・1枚まで・重複不可）**
→ (A) `UNIQUE(user_id, sticker_id)` on `user_stickers`

### 永続・保存数

**I4. 一度入手した作品は図鑑から消えない（失効しても）**
→ (B) `collections` は append-only。`INSERT ... ON CONFLICT DO NOTHING`、DELETEしない

**I5. 保存数への各ユーザーの寄与は最大1（水増し不可）**
→ (A) `collections` の `PRIMARY KEY(user_id, sticker_id)` + `got_normal BOOLEAN`

**I6. 保存数は札を手放しても減らない**
→ (B) 保存数は `collections.got_normal` を数える。`user_stickers` をCOUNTしない

**I7. 作者自身は自作の保存数に含まれない**
→ (B) 保存数クエリで `creator_id` を除外

### 時間・失効

**I8. 期限は全員共通（同じ作品なら失効時刻は同一）**
→ (A) 期限を `prompts.expires_at` に集約。`stickers`・`user_stickers` は期限を持たない

**I9. 失効後はそのお題の全シールが一斉に使用不可**
→ (C) 操作時に `prompts.expires_at > now()` を判定

**I10. 広場でのお絵描き・広場保存は「opens〜closes・在室」のみ**
→ (C) サーバが時間窓＋Socket.IO在室を判定

### variant（見た目）

**I15. チャットに送ったシールの履歴は、送信者が後で手放しても・失効しても変わらない**
→ (A)/(B) `messages` に `sticker_id` をスナップショット保存。所持(`user_stickers`)に依存しない

**I18. チャット保存は closes 後も expires まで可能**
→ (C) 保存操作のガードは `expires_at > now()` のみ。`closes_at` は広場保存・お絵描きの締切専用

**I19. 1ユーザーは1お題につき1枚しか投稿できない。保存したら変更・再投稿不可（一発確定）**
→ (A) `UNIQUE(prompt_id, creator_id)` on `stickers`。アプリ側で投稿済み判定→お絵描き画面をロック。UPDATE/DELETEしない

### 空間配置（広場）

**I21（改）. 各シールは配置時に空きブロックをランダムに1つ占有し、ブロック単位で非接触が保証される**
→ (A) `stickers` は `block_x, block_y` を持つ。`UNIQUE(prompt_id, block_x, block_y)`

**I22. 座標はお題（prompt）単位の空間に属する**
→ お題ごとにフィールドが切り替わる。表示は現在お題のstickerのみ描画

**I23（改）. 盤面サイズはブロック数を密度から逆算して決まる（可変対応）**
```
MAX_TIER    = 10           // 最大10×10マス
BLOCK_CELLS = 10 + 1 = 11  // 最大10 + 余白1マス

blocks_needed = EXPECTED_N / DENSITY = 80 / 0.08 = 1000ブロック
GRID_BLOCKS   = ceil(sqrt(1000)) = 32ブロック（一辺）
盤面マス一辺   = 32 × 11 = 352マス
```

**I25. 表示サイズは保存数から都度コードで導出し、DBには持たない**
→ 保存数は `collections.got_normal` カウント（I5）。座標のみDB、サイズは描画時に算出

**I26. 表示ティアは 1×1 / 2×2 / 4×4 / 10×10 の4段階、保存数閾値で決まる**
```typescript
function tierSize(saveCount: number): 1|2|4|10 {
  if (saveCount >= 50) return 10; // 殿堂級
  if (saveCount >= 20) return 4;
  if (saveCount >= 5)  return 2;
  return 1;                        // 新作
}
```
- その場で育つ（引っ越さない）。ブロックが育ちしろを内包するので衝突しない
- 閾値5/20/50は定数、後で調整可能
- 失効で全リセット、次のお題は全員1×1から

### 今回未使用（交換機能カットのため）

I11〜I14・I17・I20・I24（variant区別・trade・sticker_holds・kira関連）は今回のスコープでは使わない。

---

## テーブル定義（6テーブル）

```sql
-- ユーザー
CREATE TABLE users (
  id           BIGSERIAL PRIMARY KEY,
  handle       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- お題：期限の持ち主。opens/closes/expiresの3点で枠を分離
CREATE TABLE prompts (
  id         BIGSERIAL PRIMARY KEY,
  theme      TEXT NOT NULL,
  opens_at   TIMESTAMPTZ NOT NULL,   -- 描く/広場保存 開始
  closes_at  TIMESTAMPTZ NOT NULL,   -- 作画・広場保存の締切
  expires_at TIMESTAMPTZ NOT NULL,   -- 一斉失効
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (opens_at <= closes_at AND closes_at <= expires_at)
);

-- 作品（16x16ドット絵）。1お題1人1枚（I19）。座標はブロック単位（I21改）
CREATE TABLE stickers (
  id         BIGSERIAL PRIMARY KEY,
  prompt_id  BIGINT NOT NULL REFERENCES prompts(id),
  creator_id BIGINT NOT NULL REFERENCES users(id),
  pixels     JSONB NOT NULL,   -- 256要素のパレットindex配列(0-15)
  block_x    INT NOT NULL,
  block_y    INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, creator_id),      -- I19: 1お題1人1枚
  UNIQUE (prompt_id, block_x, block_y) -- I21改: ブロック非接触
);
CREATE INDEX idx_stickers_prompt  ON stickers(prompt_id);

-- 現在の所持＝使えるトレイ
CREATE TABLE user_stickers (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  sticker_id   BIGINT NOT NULL REFERENCES stickers(id),
  acquired_via TEXT NOT NULL CHECK (acquired_via IN ('plaza','chat')),
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sticker_id)  -- I1: 未保有のみ・1枚まで
);
CREATE INDEX idx_us_user ON user_stickers(user_id);

-- 図鑑＝永続の入手台帳。保存数の真実はここ（I4〜I7）
CREATE TABLE collections (
  user_id           BIGINT NOT NULL REFERENCES users(id),
  sticker_id        BIGINT NOT NULL REFERENCES stickers(id),
  got_normal        BOOLEAN NOT NULL DEFAULT false,
  first_acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);
CREATE INDEX idx_col_sticker ON collections(sticker_id);

-- メッセージ：ログイン中の全員が同じ場を見るオープンチャット（room概念なし）
-- シール送信時は見た目をスナップ保存（I15）
CREATE TABLE messages (
  id         BIGSERIAL PRIMARY KEY,
  sender_id  BIGINT NOT NULL REFERENCES users(id),
  kind       TEXT NOT NULL CHECK (kind IN ('text','sticker')),
  body       TEXT,
  sticker_id BIGINT REFERENCES stickers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (kind='text'    AND body IS NOT NULL AND sticker_id IS NULL) OR
    (kind='sticker' AND sticker_id IS NOT NULL)
  )
);
CREATE INDEX idx_msg_time ON messages(created_at);
```

Socket.IOは広場と同じ「全員に一斉配信」の形でよい。room_idごとのjoin/配信管理が不要になった分、実装は単純化する。

---

## fieldConfig.ts（広場の定数）

```typescript
export const SPRITE_SIZE = 16;   // ドット絵の一辺(px)
export const GUTTER      = 16;   // 絵と絵の最小余白(px)
export const CELL        = SPRITE_SIZE + GUTTER; // = 32

export const DENSITY     = 0.08; // 目標占有率
export const EXPECTED_N  = 80;   // お題あたり想定投稿数

export const MAX_TIER    = 10;
export const BLOCK_CELLS = MAX_TIER + 1; // = 11

export const GRID_BLOCKS = Math.ceil(Math.sqrt(EXPECTED_N / DENSITY)); // = 32
export const GRID_CELLS  = GRID_BLOCKS * BLOCK_CELLS; // = 352

// 保存数 → 表示ティア
export function tierSize(saveCount: number): 1|2|4|10 {
  if (saveCount >= 50) return 10;
  if (saveCount >= 20) return 4;
  if (saveCount >= 5)  return 2;
  return 1;
}
```

---

## 画面構成（全8面・確定スコープ）

1. 広場 / 初期ズーム（STATE1：opens〜closes）
2. 広場 / 余韻（STATE2：closes〜expires）
3. 広場 / ドット絵を開く（拡大・保存）
4. お絵描き（16×16・固定16色・標準操作・一発確定）
5. チャット（オープン・ログイン中の全員が同じ場、部屋選択なし）
6. シールピッカー（使える札のみ表示）
7. 図鑑（集めた / 描いた の2区分）
8. 設定（アカウント・通知・クレジット）

4タブ構成：広場 / チャット / 図鑑 / 設定

---

## 日程（7/4〜7/15・12日）

チャットをオープン1本にしたことでroom管理が不要になり、当初見積もりよりバック側の負荷は軽い方向。

```
7/4-5   設計最終化
7/6-10  実装並行（バック/フロント、7/10前後にティア切替の集中日）
7/11-12 統合
7/13    通しテスト
7/14    バグ潰し＋発表準備
7/15    提出
```
