import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/ApiClient';
import type { CollectedSticker, CreatedSticker } from '../types';

const listeners = new Set<() => void>();

let collected: CollectedSticker[] = [];
let created: CreatedSticker[] = [];
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
    [collected, created] = await Promise.all([apiClient.getCollections(), apiClient.getCreated()]);
  } catch (err) {
    error = err instanceof Error ? err.message : '図鑑の取得に失敗しました';
  } finally {
    loading = false;
    notify();
  }
}

void loadInitial();

export async function refreshZukan(): Promise<void> {
  await loadInitial();
}

function getCollected(): CollectedSticker[] {
  return collected;
}

function getCreated(): CreatedSticker[] {
  return created;
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

export function useZukan(): {
  collected: CollectedSticker[];
  created: CreatedSticker[];
  loading: boolean;
  error: string | null;
} {
  const currentCollected = useSyncExternalStore(subscribe, getCollected);
  const currentCreated = useSyncExternalStore(subscribe, getCreated);
  const currentLoading = useSyncExternalStore(subscribe, getLoading);
  const currentError = useSyncExternalStore(subscribe, getError);
  return {
    collected: currentCollected,
    created: currentCreated,
    loading: currentLoading,
    error: currentError,
  };
}
