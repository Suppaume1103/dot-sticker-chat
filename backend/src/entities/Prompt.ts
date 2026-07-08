// ============================================================
// entities/Prompt.ts — 「お題」のデータの形＋状態判定ロジック
// Promptは`resolveState(now)`という振る舞いを持つため`class`にする
// 対応invariant: I8, I9, I10, I18
// ============================================================

export type PromptState = "active" | "grace" | "waiting"; // お題の状態を表す文字列

export class Prompt {
  id: string;
  theme: string;
  opensAt: Date;
  closesAt: Date;
  expiresAt: Date;

  constructor(id: string, theme: string, opensAt: Date, closesAt: Date, expiresAt: Date) {
    this.id = id;
    this.theme = theme;
    this.opensAt = opensAt;
    this.closesAt = closesAt;
    this.expiresAt = expiresAt;
  }

  // I8: 期限はprompts.expires_atに集約されている（このメソッドが唯一の判定箇所）
  // I9: 失効後（now > expiresAt）は使用不可 → "waiting"として扱う
  // I10: お絵描き・広場保存は opens〜closes のみ → "active"のときだけ許可する設計
  // I18: チャット保存は closes 後も expires まで可能 → "grace"の間も許可する設計
  resolveState(now: Date): PromptState {
    if (now < this.opensAt) {
      return "waiting"; // まだ開いていない
    }
    if (now <= this.closesAt) {
      return "active"; // お絵描き・広場保存が可能な期間
    }
    if (now <= this.expiresAt) {
      return "grace"; // チャット保存が可能な期間
    }
    return "waiting"; // 失効後
  }
}
