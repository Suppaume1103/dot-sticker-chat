// ============================================================
// infrastructure/SocketGateway.ts — Socket.IO配信専用クラス
// servicesがここを呼んでクライアントに配信する（応答は待たない）
// ============================================================

import type { Server, Socket } from "socket.io";

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
  private presenceCounts = new Map<string, number>();

  init(io: Server): void {
    this.io = io;
    io.on("connection", (socket: Socket) => {
      socket.on("field:join", ({ promptId }: { promptId: string }) => {
        socket.join(fieldRoom(promptId));
        this.changePresence(promptId, 1);
      });

      socket.on("field:leave", ({ promptId }: { promptId: string }) => {
        socket.leave(fieldRoom(promptId));
        this.changePresence(promptId, -1);
      });
    });
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

  private changePresence(promptId: string, delta: number): void {
    const count = Math.max((this.presenceCounts.get(promptId) ?? 0) + delta, 0);
    this.presenceCounts.set(promptId, count);
    this.io?.to(fieldRoom(promptId)).emit("field:presence", { count });
  }
}

// servicesはこのシングルトンをimportして直接呼ぶ（DI無し）。initはindex.tsで1回だけ行う。
export const socketGateway = new SocketGateway();
