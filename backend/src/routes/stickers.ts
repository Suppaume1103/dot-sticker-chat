// ============================================================
// routes/stickers.ts — 投稿・広場データAPIの薄いルーター
// 判断はServiceに任せ、ここではHTTPのリクエスト/レスポンスの受け渡しとエラー種別→ステータスコードの変換だけを行う。
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import {
  StickerSubmissionService,
  PromptNotFoundError,
  PromptNotDrawableError,
  AlreadySubmittedError,
  InvalidPixelsError,
} from "../services/StickerSubmissionService";
import {
  SaveService,
  StickerNotFoundError,
  SelfSaveNotAllowedError,
  SaveWindowClosedError,
  AlreadySavedError,
} from "../services/SaveService";

const router = Router();
const authService = new AuthService();
const stickerSubmissionService = new StickerSubmissionService();
const saveService = new SaveService();

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

// POST /api/prompts/:id/stickers 投稿確定（I19, I21改）
router.post("/prompts/:id/stickers", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  const { pixels } = req.body;

  try {
    const payload = authService.verifyToken(token);
    const sticker = await stickerSubmissionService.submit(id, payload.userId, pixels);
    res.status(201).json({ sticker });
  } catch (error: unknown) {
    if (error instanceof PromptNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PromptNotDrawableError) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof AlreadySubmittedError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof InvalidPixelsError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("sticker submission failed", error);
    res.status(500).json({ error: "internal server error" });
  }
});

// GET /api/prompts/:id/stickers/me 自分の投稿状況（I19、お絵描き画面のロック判定用）
router.get("/prompts/:id/stickers/me", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    const sticker = await stickerSubmissionService.getOwnSubmission(id, payload.userId);

    if (!sticker) {
      res.status(200).json({ submitted: false });
      return;
    }
    res.status(200).json({ submitted: true, sticker });
  } catch (error: unknown) {
    console.error("token verification failed", error);
    res.status(401).json({ error: "invalid token" });
  }
});

// GET /api/prompts/:id/field 広場全データ（認証不要、閲覧目的）（I21改, I22, I25）
router.get("/prompts/:id/field", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const stickers = await stickerSubmissionService.getFieldData(id);
  res.status(200).json({ stickers });
});

// GET /api/stickers/:id シール詳細（保存済み判定・自作判定込み）
router.get("/stickers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    const { isMine, alreadySaved, ...sticker } = await saveService.getDetail(id, payload.userId);
    res.status(200).json({ sticker, isMine, alreadySaved });
  } catch (error: unknown) {
    if (error instanceof StickerNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("sticker detail fetch failed", error);
    res.status(500).json({ error: "internal server error" });
  }
});

// POST /api/stickers/:id/save 保存（広場・チャット共通）（I1, I5, I6, I7, I9, I18）
router.post("/stickers/:id/save", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "authorization header is required" });
    return;
  }

  const { via } = req.body;
  if (via !== "plaza" && via !== "chat") {
    res.status(400).json({ error: "via must be 'plaza' or 'chat'" });
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    const userSticker = await saveService.save(id, payload.userId, via);
    res.status(201).json({ userSticker });
  } catch (error: unknown) {
    if (error instanceof StickerNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof SelfSaveNotAllowedError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof SaveWindowClosedError) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof AlreadySavedError) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error("sticker save failed", error);
    res.status(500).json({ error: "internal server error" });
  }
});

export default router;
