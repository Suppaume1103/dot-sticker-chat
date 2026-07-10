// ============================================================
// infrastructure/SocketGateway.ts — Socket.IO配信専用クラス
// servicesがここを呼んでクライアントに配信する（応答は待たない）
// ============================================================

import type { Server, Socket } from "socket.io";
import { AuthService } from "../services/AuthService";

// Socket.IOのイベントペイロードの型定義
interface StickerNewPayload {
  stickerId: string;
  promptId: string;
  blockX: number;
  blockY: number;
  creatorId: string;
  pixels: number[];
}

interface SaveCountUpdatedPayload {
  stickerId: string;
  saveCount: number;
  tier: 1 | 2 | 4 | 10;
}

interface PromptStateChangedPayload {
  promptId: string;
  state: "active" | "grace" | "waiting";
  prompt: unknown;
}

interface MessageNewPayload {
  id: string;
  senderId: string;
  kind: "text" | "sticker";
  body: string | null;
  stickerId: string | null;
  createdAt: Date;
}

// promptIdごとにSocket.IOのルームを作る。ユーザーがそのpromptIdのフィールドを開いたらjoinする。
function fieldRoom(promptId: string): string {
  return `prompt:${promptId}`;
}

// Socket.IOの初期化はindex.tsで1回だけ行う。サービスはこのシングルトンをimportして直接呼ぶ（DI無し）。
// index.tsでinit(io)された後だけ実際に配信する。未initの間はioがnullなので何もしない。
export class SocketGateway {
  private io: Server | null = null;
  private authService = new AuthService();
  // I10: 在室しているユーザーIDの集合をpromptIdごとに持つ。「人数」だけでなく
  // 「このユーザーが在室しているか」をPromptStateServiceから問い合わせられるようにするため、
  // countではなくSet<userId>で管理する。
  private presence = new Map<string, Set<string>>();
  // 切断時にどのpromptから在室を外せばよいか分かるよう、socket.idごとに参加中のpromptIdを覚えておく。
  private joinedPrompts = new Map<string, Set<string>>();

  init(io: Server): void {
    this.io = io;
    io.on("connection", (socket: Socket) => {
      // field:join/leaveの在室判定にuserIdが必要なため、接続時にハンドシェイクのtokenを検証しておく。
      // 検証に失敗した接続はuserIdなし＝在室カウントには参加できない（配信の受信自体はできる）。
      const userId = this.authenticate(socket);

      socket.on("field:join", ({ promptId }: { promptId: string }) => {
        socket.join(fieldRoom(promptId));
        if (userId) {
          this.addPresence(promptId, userId, socket.id);
        }
      });

      socket.on("field:leave", ({ promptId }: { promptId: string }) => {
        socket.leave(fieldRoom(promptId));
        if (userId) {
          this.removePresence(promptId, userId, socket.id);
        }
      });

      socket.on("disconnect", () => {
        if (!userId) {
          return;
        }
        // 切断時、このsocketが参加していた全promptから在室を外す。
        const promptIds = this.joinedPrompts.get(socket.id);
        promptIds?.forEach((promptId) => this.removePresence(promptId, userId, socket.id));
        this.joinedPrompts.delete(socket.id);
      });
    });
  }

  // I10: 「このユーザーがこのお題の広場に在室しているか」をPromptStateServiceから問い合わせるための窓口。
  isPresent(promptId: string, userId: string): boolean {
    return this.presence.get(promptId)?.has(userId) ?? false;
  }

  // --- 以下のemit系メソッドはサービスから呼ばれる。応答は待たない一方向配信。 ---
  emitStickerNew(payload: StickerNewPayload): void {
    this.io?.to(fieldRoom(payload.promptId)).emit("sticker:new", payload);
  }

  emitSaveCountUpdated(payload: SaveCountUpdatedPayload): void {
    this.io?.emit("sticker:save_count_updated", payload);
  }

  emitPromptStateChanged(payload: PromptStateChangedPayload): void {
    this.io?.emit("prompt:state_changed", payload);
  }

  emitMessageNew(payload: MessageNewPayload): void {
    this.io?.emit("message:new", payload);
  }

  // 接続時にハンドシェイクの`auth.token`を検証し、成功すればuserIdを返す。
  // 未提供・不正なtokenの場合はnullを返す（field:join自体は無視され、在室扱いにはならない）。
  private authenticate(socket: Socket): string | null {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
      return null;
    }
    try {
      return this.authService.verifyToken(token).userId;
    } catch {
      return null;
    }
  }

  private addPresence(promptId: string, userId: string, socketId: string): void {
    const users = this.presence.get(promptId) ?? new Set<string>();
    users.add(userId);
    this.presence.set(promptId, users);

    const prompts = this.joinedPrompts.get(socketId) ?? new Set<string>();
    prompts.add(promptId);
    this.joinedPrompts.set(socketId, prompts);

    this.io?.to(fieldRoom(promptId)).emit("field:presence", { count: users.size });
  }

  private removePresence(promptId: string, userId: string, socketId: string): void {
    const users = this.presence.get(promptId);
    users?.delete(userId);
    this.joinedPrompts.get(socketId)?.delete(promptId);

    this.io?.to(fieldRoom(promptId)).emit("field:presence", { count: users?.size ?? 0 });
  }
}

// servicesはこのシングルトンをimportして直接呼ぶ（DI無し）。initはindex.tsで1回だけ行う。
export const socketGateway = new SocketGateway();
