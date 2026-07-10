// 認証状態を管理するためのストア
import { useSyncExternalStore } from 'react';
import { apiClient } from '../api/ApiClient';
import { socketClient } from '../socket/SocketClient';
import type { User } from '../types';

const TOKEN_KEY = 'dot-sticker-chat:token';
const listeners = new Set<() => void>();

let token: string | null = localStorage.getItem(TOKEN_KEY);
let user: User | null = null;
let restoring = token !== null;

if (token) {
  apiClient.setToken(token);
  socketClient.connect(token);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

// ページ読み込み時、保存済みtokenがあれば自分の情報を復元する。
async function restore(): Promise<void> {
  if (!token) {
    restoring = false;
    notify();
    return;
  }
  try {
    user = await apiClient.getMe();
  } catch {
    // tokenが失効・不正な場合はログアウト状態に戻す。
    token = null;
    user = null;
    localStorage.removeItem(TOKEN_KEY);
    apiClient.setToken(null);
    socketClient.disconnect();
  } finally {
    restoring = false;
    notify();
  }
}

void restore();

export async function signup(handle: string, displayName: string): Promise<void> {
  const result = await apiClient.signup(handle, displayName);
  token = result.token;
  user = result.user;
  localStorage.setItem(TOKEN_KEY, token);
  apiClient.setToken(token);
  socketClient.connect(token);
  notify();
}

export async function login(handle: string): Promise<void> {
  const result = await apiClient.login(handle);
  token = result.token;
  user = result.user;
  localStorage.setItem(TOKEN_KEY, token);
  apiClient.setToken(token);
  socketClient.connect(token);
  notify();
}

export function logout(): void {
  token = null;
  user = null;
  localStorage.removeItem(TOKEN_KEY);
  apiClient.setToken(null);
  socketClient.disconnect();
  notify();
}

export function getToken(): string | null {
  return token;
}

export function getUser(): User | null {
  return user;
}

export function isRestoring(): boolean {
  return restoring;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): { token: string | null; user: User | null; restoring: boolean } {
  const currentToken = useSyncExternalStore(subscribe, getToken);
  const currentUser = useSyncExternalStore(subscribe, getUser);
  const currentRestoring = useSyncExternalStore(subscribe, isRestoring);
  return { token: currentToken, user: currentUser, restoring: currentRestoring };
}
