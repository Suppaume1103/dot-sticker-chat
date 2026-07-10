import { io, type Socket } from 'socket.io-client';
import type { FieldSticker, Prompt, PromptState, RawMessagePayload } from '../types';

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
  'message:new': (payload: RawMessagePayload) => void;
}

class SocketClient {
  // Storeがimport時点でon()を呼んでも取りこぼさないよう、socketインスタンス自体は常時生成しておき
  // connect/disconnectは接続状態の切り替えのみを行う（autoConnect: falseで初期状態は未接続）。
  private socket: Socket = io(BASE_URL, {
    transports: ['websocket'],
    autoConnect: false,
  });

  // AuthStoreのtokenをハンドシェイクに載せて接続する（backendのSocketGatewayが在室チェックに使う）。
  connect(token: string | null): void {
    this.socket.auth = { token };
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  joinField(promptId: string): void {
    this.socket.emit('field:join', { promptId });
  }

  leaveField(promptId: string): void {
    this.socket.emit('field:leave', { promptId });
  }

  on<Event extends keyof ServerToClientEvents>(event: Event, handler: ServerToClientEvents[Event]): void {
    // socket.io-clientの型は任意イベント名を許容する代わりに引数型を狭められないため、
    // ここだけ購読口の型（ServerToClientEvents）を信頼してキャストする。
    this.socket.on(event, handler as never);
  }

  off<Event extends keyof ServerToClientEvents>(event: Event, handler: ServerToClientEvents[Event]): void {
    this.socket.off(event, handler as never);
  }
}

export const socketClient = new SocketClient();
