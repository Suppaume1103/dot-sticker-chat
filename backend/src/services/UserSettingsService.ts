// ============================================================
// services/UserSettingsService.ts — 設定画面（PATCH /api/users/me）の業務ロジック
// ============================================================

import { UserRepository } from "../repositories/UserRepository";
import type { User } from "../entities/User";

// display_nameが空文字/未指定で更新しようとした場合。
export class InvalidDisplayNameError extends Error {
  constructor() {
    super("displayName must not be empty");
    this.name = "InvalidDisplayNameError";
  }
}

// ユーザー設定の更新処理を行うサービスクラス
export class UserSettingsService {
  private userRepository = new UserRepository();

  async updateDisplayName(userId: string, displayName: string | undefined): Promise<User> {
    if (!displayName || displayName.trim().length === 0) {
      throw new InvalidDisplayNameError();
    }
    return this.userRepository.updateDisplayName(userId, displayName);
  }
}
