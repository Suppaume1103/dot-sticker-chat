// ============================================================
// services/PromptStateService.ts — お題の時間窓判定
// 対応invariant: I8, I9, I10, I18
// ============================================================

import { PromptRepository } from "../repositories/PromptRepository";
import { socketGateway } from "../infrastructure/SocketGateway";
import type { Prompt, PromptState } from "../entities/Prompt";

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
  // 「今アクティブなお題、無ければ次に開くお題」はRepository側のSQLで既に絞り込まれているので、ここでは状態(state)を計算して付け足すだけ。
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

  // I10: お絵描きは「opens〜closes（＝"active"）」かつ「その広場に在室している」の両方を満たす必要がある。
  // 在室しているかどうかはSocketGatewayが持つ在室情報（field:join/leaveで更新）を問い合わせる。
  canDraw(prompt: Prompt, userId: string): boolean {
    return prompt.resolveState(new Date()) === "active" && socketGateway.isPresent(prompt.id, userId);
  }

  // I10: 広場保存もお絵描きと同じく「opens〜closes（＝"active"）」かつ「在室」の両方を満たす必要がある。
  canPlazaSave(prompt: Prompt, userId: string): boolean {
    return prompt.resolveState(new Date()) === "active" && socketGateway.isPresent(prompt.id, userId);
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
