import { io, type Socket } from 'socket.io-client';
import type { FieldSticker, Message, Prompt, PromptState } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// backendのSocketGatewayが配信するイベント。docs/api_socket_design.mdの名称と1文字も違えない。
export interface ServerToClientEvents {
  'sticker:new': (payload: {
    stickerId: string;
    promptId: string;
    blockX: number;
    blockY: number;
    creatorId: string;
    pixels: number[];
  }) => void;
  'sticker:save_count_updated': (payload: {
    stickerId: string;
    saveCount: number;
    tier: FieldSticker['tier'];
  }) => void;
  'prompt:state_changed': (payload: { promptId: string; state: PromptState; prompt: Prompt }) => void;
  'field:presence': (payload: { count: number }) => void;
  'message:new': (payload: Message) => void;
}

class SocketClient {
  private socket: Socket | null = null;

  // AuthStoreのtokenをハンドシェイクに載せて接続する（backendのSocketGatewayが在室チェックに使う）。
  connect(token: string | null): void {
    if (this.socket) {
      return;
    }
    this.socket = io(BASE_URL, {
      transports: ['websocket'],
      auth: { token },
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  joinField(promptId: string): void {
    this.socket?.emit('field:join', { promptId });
  }

  leaveField(promptId: string): void {
    this.socket?.emit('field:leave', { promptId });
  }

  on<Event extends keyof ServerToClientEvents>(event: Event, handler: ServerToClientEvents[Event]): void {
    // socket.io-clientの型は任意イベント名を許容する代わりに引数型を狭められないため、
    // ここだけ購読口の型（ServerToClientEvents）を信頼してキャストする。
    this.socket?.on(event, handler as never);
  }

  off<Event extends keyof ServerToClientEvents>(event: Event, handler: ServerToClientEvents[Event]): void {
    this.socket?.off(event, handler as never);
  }
}

export const socketClient = new SocketClient();
