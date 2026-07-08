// ============================================================
// services/PromptStateService.ts — お題の時間窓判定
//
// class_design.md: PromptStateService（時間窓判定：canDraw, canPlazaSave, canChatSave）
// 対応invariant: I8, I9, I10, I18
// ============================================================

import { PromptRepository } from "../repositories/PromptRepository";
import type { Prompt, PromptState } from "../entities/Prompt";

// --- 型のexport/import ---
// Prompt.tsで `export type PromptState = ...` としたものを、
// このファイルでも `import type` で取り込んで戻り値の型として使う。

// routes層に返す「お題＋現在の状態」のセット。
// このAPIレスポンスの形をここで型として固定しておくことで、
// routes/prompts.tsとの間で「どんな形のデータをやり取りするか」が明確になる。
export interface PromptWithState {
  prompt: Prompt;
  state: PromptState;
}

export class PromptStateService {
  private promptRepository = new PromptRepository();

  // GET /api/prompts/current 用。
  // 「今アクティブなお題、無ければ次に開くお題」はRepository側のSQLで
  // 既に絞り込まれているので、ここでは状態(state)を計算して付け足すだけ。
  async getCurrentPromptWithState(): Promise<PromptWithState | null> {
    const prompt = await this.promptRepository.findCurrent();
    if (!prompt) {
      return null;
    }
    return { prompt, state: prompt.resolveState(new Date()) };
  }

  // GET /api/prompts/:id 用。
  async getPromptWithState(id: string): Promise<PromptWithState | null> {
    const prompt = await this.promptRepository.findById(id);
    if (!prompt) {
      return null;
    }
    return { prompt, state: prompt.resolveState(new Date()) };
  }

  // --- 以下、時間窓の真偽値判定 ---
  // 引数として直接Promptを受け取る設計にしている（呼び出し側で既に
  // 取得済みのPromptを渡す想定。DBへの再取得はしない）。

  // I10: お絵描きは opens〜closes の間だけ。
  // 本来はここに「在室しているか」のSocket.IO在室チェックも必要（I10の
  // もう半分の条件）だが、SocketGatewayは未実装のため、現時点では
  // 時間窓の判定のみ行う。SocketGateway実装時にこのメソッドへ
  // 在室チェックを追加する必要がある点に注意。
  canDraw(prompt: Prompt): boolean {
    return prompt.resolveState(new Date()) === "active";
  }

  // I10: 広場保存もお絵描きと同じく opens〜closes（＝"active"）の間だけ。
  // 在室チェックについてはcanDrawと同様の注記。
  canPlazaSave(prompt: Prompt): boolean {
    return prompt.resolveState(new Date()) === "active";
  }

  // I18: チャット保存は closes 後も expires までは可能。
  // つまり"active"（opens〜closes）と"grace"（closes〜expires）の
  // どちらの状態でも許可する。
  canChatSave(prompt: Prompt): boolean {
    const state = prompt.resolveState(new Date());
    // --- || 演算子（論理OR）について ---
    // 「どちらかがtrueならtrue」という意味。ここでは
    // 「activeまたはgraceならtrue」を表す。
    return state === "active" || state === "grace";
  }
}
