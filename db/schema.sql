-- ============================================================
-- DOT STICKER CHAT — schema.sql
-- 稲村森田チーム / ネットワークプログラミング最終課題
--
-- 確定スコープ：交換機能・キラ/ボンボン版・グループチャット・
-- 1対1個別部屋は無し（オープンチャット1本）。
--
-- 対応invariant：I1, I4-I10, I15, I18, I19, I21改, I22, I23改, I25, I26
-- 未使用（交換関連、今回スコープ外）：I11-I14, I17, I20, I24
-- ============================================================

-- ------------------------------------------------------------
-- users : ユーザー
-- ------------------------------------------------------------
CREATE TABLE users (
  id           BIGSERIAL PRIMARY KEY,
  handle       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- prompts : お題
-- 期限の持ち主。opens/closes/expiresの3点で
-- 「描ける枠」「使える期限」を分離する（I8, I9, I10, I18）
-- ------------------------------------------------------------
CREATE TABLE prompts (
  id         BIGSERIAL PRIMARY KEY,
  theme      TEXT NOT NULL,
  opens_at   TIMESTAMPTZ NOT NULL,   -- 描く/広場保存 開始
  closes_at  TIMESTAMPTZ NOT NULL,   -- 作画・広場保存の締切
  expires_at TIMESTAMPTZ NOT NULL,   -- 一斉失効（I9）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_prompt_time_order CHECK (opens_at <= closes_at AND closes_at <= expires_at)
);

-- 現在アクティブなお題を高速に引くためのインデックス
CREATE INDEX idx_prompts_window ON prompts (opens_at, closes_at, expires_at);

-- ------------------------------------------------------------
-- stickers : 作品（16×16ドット絵）
-- 1お題1人1枚・一発確定（I19）
-- 座標はブロック単位で非接触を保証（I21改, I22）
-- pixels は 0〜15 のパレットindex配列256要素（固定16色）
-- ------------------------------------------------------------
CREATE TABLE stickers (
  id         BIGSERIAL PRIMARY KEY,
  prompt_id  BIGINT NOT NULL REFERENCES prompts(id),
  creator_id BIGINT NOT NULL REFERENCES users(id),
  pixels     JSONB NOT NULL,
  block_x    INT NOT NULL,
  block_y    INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- I19: 1ユーザーは1お題につき1枚まで（投稿後は再投稿不可・一発確定）
  CONSTRAINT uq_sticker_one_per_prompt UNIQUE (prompt_id, creator_id),

  -- I21改: 同一お題内でブロック座標は重複しない＝物理的に非接触
  CONSTRAINT uq_sticker_block UNIQUE (prompt_id, block_x, block_y),

  -- pixelsは256要素の配列であること（0〜15のindex）
  CONSTRAINT chk_pixels_length CHECK (jsonb_array_length(pixels) = 256)
);

CREATE INDEX idx_stickers_prompt ON stickers (prompt_id);
CREATE INDEX idx_stickers_creator ON stickers (creator_id);

-- ------------------------------------------------------------
-- user_stickers : 現在の所持＝使えるトレイ
-- 未保有のみ・1枚まで・重複不可（I1）
-- 期限切れの判定はprompts経由で行う（stickers自体は期限を持たない）
-- ------------------------------------------------------------
CREATE TABLE user_stickers (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  sticker_id   BIGINT NOT NULL REFERENCES stickers(id),
  acquired_via TEXT NOT NULL,
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- I1: 1人は同じ作品を2枚以上持てない（未保有のみ・重複不可）
  CONSTRAINT uq_user_sticker UNIQUE (user_id, sticker_id),

  CONSTRAINT chk_acquired_via CHECK (acquired_via IN ('plaza', 'chat'))
);

CREATE INDEX idx_user_stickers_user ON user_stickers (user_id);
CREATE INDEX idx_user_stickers_sticker ON user_stickers (sticker_id);

-- ------------------------------------------------------------
-- collections : 図鑑＝永続の入手台帳
-- 保存数の真実はここ（I4, I5, I6, I7）
-- append-only：一度trueになったフラグは戻さない。DELETEしない
-- got_normal が「保存したことがある」＝保存数カウントの母数
-- ------------------------------------------------------------
CREATE TABLE collections (
  user_id           BIGINT NOT NULL REFERENCES users(id),
  sticker_id        BIGINT NOT NULL REFERENCES stickers(id),
  got_normal        BOOLEAN NOT NULL DEFAULT false,
  first_acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- I5: 1ユーザーの保存数への寄与は最大1（行が1つ＝寄与は最大1）
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX idx_collections_sticker ON collections (sticker_id);
CREATE INDEX idx_collections_user ON collections (user_id);

-- ------------------------------------------------------------
-- messages : オープンチャット
-- ログイン中の全員が同じ場を見る（room概念なし）
-- シール送信時は見た目をスナップ保存（I15）＝所持状況に依存しない
-- ------------------------------------------------------------
CREATE TABLE messages (
  id         BIGSERIAL PRIMARY KEY,
  sender_id  BIGINT NOT NULL REFERENCES users(id),
  kind       TEXT NOT NULL,
  body       TEXT,
  sticker_id BIGINT REFERENCES stickers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_message_kind CHECK (kind IN ('text', 'sticker')),

  -- kind='text' なら body必須・sticker_id無し
  -- kind='sticker' なら sticker_id必須
  CONSTRAINT chk_message_payload CHECK (
    (kind = 'text'    AND body IS NOT NULL AND sticker_id IS NULL) OR
    (kind = 'sticker' AND sticker_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_time ON messages (created_at);

-- ============================================================
-- 参考：保存数クエリ（I5, I6, I7）
-- 保存数は collections.got_normal を数える。
-- user_stickers をCOUNTしない（手放しても保存数は減らない＝I6）。
-- 作者自身は除外する（I7）。
-- ============================================================
-- SELECT COUNT(*) FROM collections c
-- WHERE c.sticker_id = $1
--   AND c.got_normal = true
--   AND c.user_id <> (SELECT creator_id FROM stickers WHERE id = $1);

-- ============================================================
-- 参考：表示サイズ（ティア）はDBに持たない（I25, I26）
-- 保存数から都度コードで算出する。閾値は実装側のfieldConfig.tsに集約：
--   saveCount >= 50 -> 10×10（殿堂級）
--   saveCount >= 20 -> 4×4
--   saveCount >= 5  -> 2×2
--   それ以外        -> 1×1
-- ============================================================
