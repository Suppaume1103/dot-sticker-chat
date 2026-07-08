// ============================================================
// routes/prompts.ts — お題APIの薄いルーター
// routes/auth.tsと同じ方針：判断はServiceに任せ、ここではHTTPのリクエスト/レスポンスの受け渡しだけを行う。
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { PromptStateService } from "../services/PromptStateService";

const router = Router();
const promptStateService = new PromptStateService();

// GET /api/prompts/current
// 現在アクティブなお題（無ければ次に開くお題）を状態付きで返す。
router.get("/current", async (_req: Request, res: Response) => {
  const result = await promptStateService.getCurrentPromptWithState();

  if (!result) {
    // promptsテーブルに1件も無い場合。運用上はscheduler等が事前に
    // お題を作っておく想定なので、通常は起きないはずのケース。
    res.status(404).json({ error: "no prompt scheduled" });
    return;
  }

  res.status(200).json({
    prompt: result.prompt,
    state: result.state,
  });
});

// GET /api/prompts/:id
// --- req.params について ---
// URLの `:id` の部分は req.params.id として文字列で受け取れる。
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const result = await promptStateService.getPromptWithState(id);

  if (!result) {
    res.status(404).json({ error: "prompt not found" });
    return;
  }

  res.status(200).json({
    prompt: result.prompt,
    state: result.state,
  });
});

export default router;
