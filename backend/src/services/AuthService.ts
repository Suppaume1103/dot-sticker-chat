// ============================================================
// services/AuthService.ts — 認証まわりの業務ロジック
// パスワード照合をしない簡易認証（handleを名乗ればJWTを発行する）。
// ============================================================

import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/UserRepository";
import type { User } from "../entities/User";

// --- 環境変数の扱い ---
// process.env.JWT_SECRET は string | undefined。
// undefinedのまま jwt.sign に渡すと危険な鍵で署名してしまうので、起動時点で「無ければ即エラーで落とす」ようにする
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

// --- カスタムエラークラス ---
export class UserNotFoundError extends Error {
  constructor(handle: string) {
    super(`user not found: ${handle}`);
    this.name = "UserNotFoundError";
  }
}

// handleが空文字/空白のみの場合。UNIQUE制約は空文字同士の重複も防げないため、ここで弾く。
export class EmptyHandleError extends Error {
  constructor() {
    super("handle must not be empty");
    this.name = "EmptyHandleError";
  }
}

// JWTペイロード（トークンの中身）の型。ここではuserIdだけ入れる。
interface TokenPayload {
  userId: string;
}

export class AuthService {
  private userRepository = new UserRepository();

  // 新規登録：ユーザーを作成し、そのままログイン状態にするためのtokenを返す。
  async signup(handle: string, displayName: string): Promise<{ user: User; token: string }> {
    if (handle.trim().length === 0) {
      throw new EmptyHandleError();
    }

    // 「同じhandleが既に存在するか」の事前チェックはしない。
    // UserRepository.createがDBのUNIQUE(handle)違反をそのまま例外として投げるので、呼び出し元（routes/auth.ts）が捕まえて409を返す設計にする。
    const user = await this.userRepository.create(handle, displayName);
    const token = this.issueToken(user);
    return { user, token };
  }

  // ログイン：パスワード照合はせず、handleが存在するかだけを確認してtokenを返す。
  async login(handle: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findByHandle(handle);
    if (!user) {
      throw new UserNotFoundError(handle);
    }
    const token = this.issueToken(user);
    return { user, token };
  }

  // Authorizationヘッダから受け取ったtokenを検証し、ペイロードを返す。
  // 不正・期限切れのtokenなら jwt.verify が例外を投げる（そのまま呼び出し元に伝播させる）。
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  }

  // JWTを発行する。ペイロードにuserIdだけ入れる。
  private issueToken(user: User): string {
    const payload: TokenPayload = { userId: user.id };
    // 第3引数のoptionsで有効期限を設定。7日間に設定。
    return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "7d" });
  }
}
