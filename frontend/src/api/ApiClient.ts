import type { FieldSticker, HealthResponse, Message, Sticker, User } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  submitSticker(promptId: number, pixels: number[]): Promise<Sticker> {
    return this.request<Sticker>(`/api/prompts/${promptId}/stickers`, {
      method: 'POST',
      body: JSON.stringify({ pixels }),
    });
  }

  getMessages(before?: number, limit = 50): Promise<Message[]> {
    const params = new URLSearchParams();
    if (before) params.set('before', String(before));
    params.set('limit', String(limit));
    return this.request<Message[]>(`/api/messages?${params.toString()}`);
  }

  sendMessage(body: { kind: 'text'; body: string } | { kind: 'sticker'; stickerId: number }): Promise<Message> {
    return this.request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getCollections(): Promise<FieldSticker[]> {
    return this.request<FieldSticker[]>('/api/users/me/collections');
  }

  getCreated(): Promise<FieldSticker[]> {
    return this.request<FieldSticker[]>('/api/users/me/created');
  }

  getTray(): Promise<Sticker[]> {
    return this.request<Sticker[]>('/api/users/me/tray');
  }

  updateMe(patch: { displayName?: string }): Promise<User> {
    return this.request<User>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
}

export const apiClient = new ApiClient();
