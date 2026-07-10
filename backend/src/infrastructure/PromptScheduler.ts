// ============================================================
// infrastructure/PromptScheduler.ts — お題の状態変化検知・次お題自動生成
// 対応invariant: I8, I9（期限はprompts.expires_atに集約、失効後は一斉使用不可）
// ============================================================


const cron: { schedule: (pattern: string, fn: () => void) => { stop: () => void } } = require("node-cron"); // node-cronの型定義が古く、schedule()の戻り値の型がexportされていないので、anyで代用する。
type ScheduledTask = ReturnType<typeof cron.schedule>; // node-cronの戻り値の型がexportされていないので、型エイリアスで代用する。

import { PromptRepository } from "../repositories/PromptRepository";
import { socketGateway } from "./SocketGateway";
import { DRAW_WINDOW_MS, GRACE_WINDOW_MS, SCHEDULER_CRON, THEMES } from "../config/fieldConfig";
import type { Prompt, PromptState } from "../entities/Prompt";

// I9: お題の状態変化を検知し、変化があればSocketGateway経由でフロントに通知する。変化がなければ何もしない。
export class PromptScheduler {
  private promptRepository = new PromptRepository();
  private task: ScheduledTask | null = null;
  // 直近tickで配信済みの状態。promptIdまたはstateが変わった時だけ再配信するための記録。
  private lastNotified: { promptId: string; state: PromptState } | null = null;
  // THEMESを順番に使い切るためのカーソル。
  private themeIndex = 0;

  // I9: cronで定期的にtick()を呼び出す。tick()内でお題の状態変化を検知し、変化があればSocketGateway経由でフロントに通知する。
  start(): void {
    this.task = cron.schedule(SCHEDULER_CRON, () => {
      this.tick().catch((error: unknown) => {
        // cronのコールバック内で投げても誰も拾えないため、ここでログに残す。
        console.error("PromptScheduler tick failed:", error);
      });
    });
  }

  // I9: cronを停止する。テスト時に複数回start()してもcronが重複しないよう、stop()してからstart()する。
  stop(): void {
    this.task?.stop();
  }

  // I9: 失効していないお題があればそれを使う。無ければ尽きているので次お題を生成する。状態が変わっていればフロントに通知する。
  private async tick(): Promise<void> {
    // I9: 失効していない（expires_at >= now）お題があればそれを使う。無ければ尽きているので次お題を生成する（I8: 期限をprompts側に集約）。
    const prompt = (await this.promptRepository.findCurrent()) ?? (await this.generateNextPrompt());

    const state = prompt.resolveState(new Date()); // I9: 現在時刻でお題の状態を判定する。期限はprompts.expires_atに集約されているので、ここではexpires_atを参照するだけでよい。
    const changed =
      !this.lastNotified || this.lastNotified.promptId !== prompt.id || this.lastNotified.state !== state;

    if (changed) {
      this.lastNotified = { promptId: prompt.id, state };
      socketGateway.emitPromptStateChanged({ promptId: prompt.id, state, prompt });
    }
  }

  // I9: 次お題を生成する。THEMESを順番に使い切るため、themeIndexを使ってTHEMESからテーマを選ぶ。期限はprompts.expires_atに集約する。
  private async generateNextPrompt(): Promise<Prompt> {
    const theme = THEMES[this.themeIndex % THEMES.length];
    this.themeIndex += 1;

    const opensAt = new Date();
    const closesAt = new Date(opensAt.getTime() + DRAW_WINDOW_MS);
    const expiresAt = new Date(closesAt.getTime() + GRACE_WINDOW_MS);

    return this.promptRepository.create(theme, opensAt, closesAt, expiresAt);
  }
}

export const promptScheduler = new PromptScheduler();
