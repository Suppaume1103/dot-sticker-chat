// ============================================================
// routes/messages.ts — チャットAPIのルーター
// 判断はChatServiceに任せ、ここではHTTPのリクエスト/レスポンスの受け渡しとエラー種別→ステータスコードの変換だけを行う。
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import {
  ChatService,
  EmptyMessageError,
  StickerNotFoundError,
  StickerNotOwnedError,
  StickerExpiredError,
} from "../services/ChatService";

const router = Router();
const authService = new AuthService();
const chatService = new ChatService();

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

const DEFAULT_LIMIT = 50;

// GET /api/messages?before=&limit= 直近メッセージ取得（ページング）（I15）
router.get("/messages", async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  try {
    authService.verifyToken(token);
  } catch (error: unknown) {
    console.error("token verification failed", error);
    res.status(401).json({ error: "invalid token" });
    return;
  }

  // req.query.xxx は常に string | undefined 型（クエリパラメータは常に文字列で届くため）。
  // 数値・日時として使うにはここで検証・変換してから渡す必要がある。
  const { before, limit } = req.query;

  // beforeはISO 8601形式の文字列で送られてくるので、Dateに変換する。
  let beforeDate: Date | null = null;
  if (typeof before === "string") {
    const parsed = new Date(before);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: "before must be a valid ISO date string" });
      return;
    }
    beforeDate = parsed;
  }

  // limitは正の整数である必要がある。文字列で送られてくるので、ここで検証・変換する。
  let limitNumber = DEFAULT_LIMIT;
  if (typeof limit === "string") {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      res.status(400).json({ error: "limit must be a positive integer" });
      return;
    }
    limitNumber = parsed;
  }

  const messages = await chatService.getRecent(beforeDate, limitNumber);
  res.status(200).json({ messages });
});

// POST /api/messages 送信（I15）
router.post("/messages", async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  const { kind, body, sticker_id: stickerId } = req.body;
  if (kind !== "text" && kind !== "sticker") {
    res.status(400).json({ error: "kind must be 'text' or 'sticker'" });
    return;
  }

  try {
    const payload = authService.verifyToken(token);

    if (kind === "text") {
      const message = await chatService.sendText(payload.userId, body);
      res.status(201).json({ message });
      return;
    }

    if (typeof stickerId !== "string") {
      res.status(400).json({ error: "sticker_id is required" });
      return;
    }
    const message = await chatService.sendSticker(payload.userId, stickerId);
    res.status(201).json({ message });
  } catch (error: unknown) {
    if (error instanceof EmptyMessageError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof StickerNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof StickerNotOwnedError) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof StickerExpiredError) {
      res.status(403).json({ error: error.message });
      return;
    }
    console.error("message send failed", error);
    res.status(500).json({ error: "internal server error" });
  }
});

export default router;
