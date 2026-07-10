// 広場の状態を管理するためのストア
import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/ApiClient';
import { socketClient } from '../socket/SocketClient';
import { tierSize } from '../config/fieldConfig';
import type { FieldSticker, Prompt, PromptState } from '../types';

const listeners = new Set<() => void>();

let prompt: Prompt | null = null;
let state: PromptState | null = null;
let stickers: FieldSticker[] = [];
let presenceCount = 0;
let loading = false;
let error: string | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

async function loadInitial(): Promise<void> {
  loading = true;
  error = null;
  notify();
  try {
    const current = await apiClient.getCurrentPrompt();
    prompt = current.prompt;
    state = current.state;
    stickers = await apiClient.getField(current.prompt.id);
  } catch (err) {
    error = err instanceof Error ? err.message : '広場の取得に失敗しました';
  } finally {
    loading = false;
    notify();
  }
}

function onStickerNew(payload: {
  stickerId: string;
  promptId: string;
  blockX: number;
  blockY: number;
  creatorId: string;
  pixels: number[];
}): void {
  if (!prompt || payload.promptId !== prompt.id) {
    return;
  }
  const newSticker: FieldSticker = {
    id: payload.stickerId,
    promptId: payload.promptId,
    creatorId: payload.creatorId,
    pixels: payload.pixels,
    blockX: payload.blockX,
    blockY: payload.blockY,
    createdAt: new Date().toISOString(),
    saveCount: 0,
    tier: tierSize(0),
  };
  stickers = [...stickers, newSticker];
  notify();
}

function onSaveCountUpdated(payload: {
  stickerId: string;
  saveCount: number;
  tier: FieldSticker['tier'];
}): void {
  stickers = stickers.map((sticker) =>
    sticker.id === payload.stickerId
      ? { ...sticker, saveCount: payload.saveCount, tier: payload.tier }
      : sticker,
  );
  notify();
}

function onPromptStateChanged(payload: {
  promptId: string;
  state: PromptState;
  prompt: Prompt;
}): void {
  if (prompt && payload.promptId !== prompt.id) {
    // お題が切り替わった場合はroomを移動してから最新のフィールドを取り直す
    const previousPromptId = prompt.id;
    socketClient.leaveField(previousPromptId);
    socketClient.joinField(payload.promptId);
    void loadInitial();
    return;
  }
  prompt = payload.prompt;
  state = payload.state;
  notify();
}

function onPresence(payload: { count: number }): void {
  presenceCount = payload.count;
  notify();
}

socketClient.on('sticker:new', onStickerNew);
socketClient.on('sticker:save_count_updated', onSaveCountUpdated);
socketClient.on('prompt:state_changed', onPromptStateChanged);
socketClient.on('field:presence', onPresence);

void loadInitial();

export function joinPlazaField(promptId: string): void {
  socketClient.joinField(promptId);
}

export function leavePlazaField(promptId: string): void {
  socketClient.leaveField(promptId);
}

function getPrompt(): Prompt | null {
  return prompt;
}

function getState(): PromptState | null {
  return state;
}

function getStickers(): FieldSticker[] {
  return stickers;
}

function getPresenceCount(): number {
  return presenceCount;
}

function getLoading(): boolean {
  return loading;
}

function getError(): string | null {
  return error;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlaza(): {
  prompt: Prompt | null;
  state: PromptState | null;
  stickers: FieldSticker[];
  presenceCount: number;
  loading: boolean;
  error: string | null;
} {
  const currentPrompt = useSyncExternalStore(subscribe, getPrompt);
  const currentState = useSyncExternalStore(subscribe, getState);
  const currentStickers = useSyncExternalStore(subscribe, getStickers);
  const currentPresenceCount = useSyncExternalStore(subscribe, getPresenceCount);
  const currentLoading = useSyncExternalStore(subscribe, getLoading);
  const currentError = useSyncExternalStore(subscribe, getError);
  return {
    prompt: currentPrompt,
    state: currentState,
    stickers: currentStickers,
    presenceCount: currentPresenceCount,
    loading: currentLoading,
    error: currentError,
  };
}
