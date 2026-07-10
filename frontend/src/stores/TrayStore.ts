import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/ApiClient';
import type { TrayItem } from '../types';

const listeners = new Set<() => void>();

let tray: TrayItem[] = [];
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
    tray = await apiClient.getTray();
  } catch (err) {
    error = err instanceof Error ? err.message : '手持ちシールの取得に失敗しました';
  } finally {
    loading = false;
    notify();
  }
}

void loadInitial();

export async function refreshTray(): Promise<void> {
  await loadInitial();
}

function getTray(): TrayItem[] {
  return tray;
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

export function useTray(): { tray: TrayItem[]; loading: boolean; error: string | null } {
  const currentTray = useSyncExternalStore(subscribe, getTray);
  const currentLoading = useSyncExternalStore(subscribe, getLoading);
  const currentError = useSyncExternalStore(subscribe, getError);
  return { tray: currentTray, loading: currentLoading, error: currentError };
}
