// ============================================================
// routes/auth.ts — 認証APIのルーティング
// ここではリクエストの受け取り・レスポンス整形・エラーのHTTPステータスへの変換だけを行い、判断そのものはAuthServiceに任せる。
// ============================================================

import { Router } from "express";
import type { Request, Response } from "express";
import { AuthService, UserNotFoundError, EmptyHandleError } from "../services/AuthService";
import { UserRepository } from "../repositories/UserRepository";


const router = Router();
const authService = new AuthService();
const userRepository = new UserRepository();

// --- Authorizationヘッダからtokenを取り出す小さなヘルパー ---
// "Bearer xxxxx" という文字列から xxxxx 部分だけを取り出す。
function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) {
    return null;
  }
  // "Bearer xxxxx".split(" ") で ["Bearer", "xxxxx"] という配列になる。
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

// POST /api/auth/signup サインアップ
router.post("/signup", async (req: Request, res: Response) => {
  const { handle, displayName } = req.body;

  // --- 入力値の検証（システム境界での必須チェック）---
  if (typeof handle !== "string" || typeof displayName !== "string") {
    res.status(400).json({ error: "ユーザーIDと表示名は必須です" });
    return;
  }

  try {
    const { user, token } = await authService.signup(handle, displayName);
    res.status(201).json({ user, token });
  } catch (error: unknown) {
    if (error instanceof EmptyHandleError) { // handleが空文字列だった場合
      res.status(400).json({ error: error.message });
      return;
    }
    // pgがUNIQUE制約違反を投げるとき、エラーオブジェクトのcodeが"23505"になる。
    // errorの型は unknown（何が投げられるか分からない）なので、使う前に「pgのエラーらしい形か」をチェックしてから中身を読む。
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      res.status(409).json({ error: "このユーザーIDは既に存在します" });
      return;
    }
    console.error("signup failed", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// POST /api/auth/login ログイン
router.post("/login", async (req: Request, res: Response) => {
  const { handle } = req.body;

  if (typeof handle !== "string") {
    res.status(400).json({ error: "ユーザーIDは必須です" });
    return;
  }

  try {
    const { user, token } = await authService.login(handle);
    res.status(200).json({ user, token });
  } catch (error: unknown) {
    // instanceof は「このエラーが特定のクラスから作られたものか」を判定する。
    if (error instanceof UserNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("login failed", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// POST /api/auth/logout ログアウト
// JWTはサーバ側で状態を持たない（ステートレス）ため、サーバ側での無効化処理は無い。
// クライアントが保持しているtokenを破棄すればログアウトしたことになる、という
// 前提の上で、形だけのエンドポイントとして成功レスポンスのみ返す。
router.post("/logout", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// GET /api/auth/me 自分のユーザー情報を取得する
router.get("/me", async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "認証ヘッダーが必要です" });
    return;
  }

  let payload;
  try {
    // jwt.verifyは期限切れ・改ざんされたtokenに対して例外を投げる。
    payload = authService.verifyToken(token);
  } catch (error: unknown) {
    console.error("token verification failed", error);
    res.status(401).json({ error: "無効なトークンです" });
    return;
  }

  const user = await userRepository.findById(payload.userId);

  if (!user) {
    res.status(404).json({ error: "ユーザーが見つかりません" });
    return;
  }

  res.status(200).json({ user });
});

export default router;
