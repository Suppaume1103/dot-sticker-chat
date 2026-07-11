// チャットの状態を管理するためのストア
import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/ApiClient';
import { socketClient } from '../socket/SocketClient';
import type { Message, RawMessagePayload } from '../types';

const listeners = new Set<() => void>();

let messages: Message[] = [];
let loading = false;
let error: string | null = null;

// 変更があったときにリスナーを通知する
function notify(): void {
  listeners.forEach((listener) => listener());
}

// 初期データをロードする
async function loadInitial(): Promise<void> {
  loading = true;
  error = null;
  notify();
  try {
    messages = (await apiClient.getMessages()).reverse();
  } catch (err) {
    error = err instanceof Error ? err.message : 'メッセージの取得に失敗しました';
  } finally {
    loading = false;
    notify();
  }
}

// RawMessagePayloadをMessageに変換する
function toMessage(raw: RawMessagePayload): Message {
  return {
    id: raw.id,
    senderId: raw.senderId,
    senderDisplayName: raw.senderDisplayName,
    kind: raw.kind,
    body: raw.body ?? undefined,
    stickerId: raw.stickerId ?? undefined,
    createdAt: raw.createdAt,
  };
}

// 新しいメッセージが届いたときの処理
function onMessageNew(raw: RawMessagePayload): void {
  if (messages.some((m) => m.id === raw.id)) {
    // 自分の送信はAPIレスポンスで既に追加済みのため、同一idの重複を無視する
    return;
  }
  messages = [...messages, toMessage(raw)];
  notify();
}

socketClient.on('message:new', onMessageNew);

void loadInitial();

// メッセージを送信する
export async function sendText(body: string): Promise<void> {
  const message = await apiClient.sendMessage({ kind: 'text', body });
  if (!messages.some((m) => m.id === message.id)) {
    messages = [...messages, message];
    notify();
  }
}

// ドットステッカーを送信する
export async function sendSticker(stickerId: string): Promise<void> {
  const message = await apiClient.sendMessage({ kind: 'sticker', stickerId });
  if (!messages.some((m) => m.id === message.id)) {
    messages = [...messages, message];
    notify();
  }
}

function getMessages(): Message[] {
  return messages;
}

function getLoading(): boolean {
  return loading;
}

function getError(): string | null {
  return error;
}

// リスナーを登録する
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Reactのカスタムフックとして状態を提供する
export function useChat(): { messages: Message[]; loading: boolean; error: string | null } {
  const currentMessages = useSyncExternalStore(subscribe, getMessages);
  const currentLoading = useSyncExternalStore(subscribe, getLoading);
  const currentError = useSyncExternalStore(subscribe, getError);
  return { messages: currentMessages, loading: currentLoading, error: currentError };
}
