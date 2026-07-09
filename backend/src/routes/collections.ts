// ============================================================
// routes/collections.ts — 図鑑（集めた/描いた/トレイ）APIのルーター
// 判断はCollectionQueryServiceに任せ、ここではHTTPのリクエスト/レスポンスの受け渡しだけを行う。
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { CollectionQueryService } from "../services/CollectionQueryService";

const router = Router();
const authService = new AuthService();
const collectionQueryService = new CollectionQueryService();

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

// 3エンドポイントとも「認証必須→userId取得」までの手順が同じなので、共通処理として関数化する。
// 認証に失敗したら401を返し、成功したらuserIdを返す（呼び出し側でnullなら早期returnする）。
async function requireUserId(req: Request, res: Response): Promise<string | null> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return null;
  }
  try {
    const payload = authService.verifyToken(token);
    return payload.userId;
  } catch (error: unknown) {
    console.error("token verification failed", error);
    res.status(401).json({ error: "invalid token" });
    return null;
  }
}

// GET /api/users/me/collections 「集めた」一覧（I4）
router.get("/users/me/collections", async (req: Request, res: Response) => {
  const userId = await requireUserId(req, res);
  if (!userId) {
    return;
  }
  const collections = await collectionQueryService.getCollected(userId);
  res.status(200).json({ collections });
});

// GET /api/users/me/created 「描いた」一覧（I4, I5, I6, I7）
router.get("/users/me/created", async (req: Request, res: Response) => {
  const userId = await requireUserId(req, res);
  if (!userId) {
    return;
  }
  const created = await collectionQueryService.getCreated(userId);
  res.status(200).json({ created });
});

// GET /api/users/me/tray 「使える札」＝トレイ（I1）
router.get("/users/me/tray", async (req: Request, res: Response) => {
  const userId = await requireUserId(req, res);
  if (!userId) {
    return;
  }
  const tray = await collectionQueryService.getTray(userId);
  res.status(200).json({ tray });
});

export default router;
