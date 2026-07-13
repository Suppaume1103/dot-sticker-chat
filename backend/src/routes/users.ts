// ============================================================
// routes/users.ts — 設定APIのルーター
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { UserSettingsService, InvalidDisplayNameError } from "../services/UserSettingsService";

const router = Router();
const authService = new AuthService();
const userSettingsService = new UserSettingsService();

// ヘッダーからBearerトークンを抽出するユーティリティ関数
function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

// PATCH /api/users/me display_name等の編集
router.patch("/users/me", async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "認証ヘッダーが必要です" });
    return;
  }

  const { display_name: displayName } = req.body;

  try {
    const payload = authService.verifyToken(token);
    const user = await userSettingsService.updateDisplayName(payload.userId, displayName);
    res.status(200).json({ user });
  } catch (error: unknown) {
    if (error instanceof InvalidDisplayNameError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("user settings update failed", error);
    res.status(401).json({ error: "無効なトークンです" });
  }
});

export default router;
