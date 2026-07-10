import type {
  FieldSticker,
  HealthResponse,
  Message,
  Prompt,
  PromptState,
  Sticker,
  User,
} from '../types';

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
      // backendは失敗時に { error: string } を返すので、それをメッセージとして使う。
      const body = await res.json().catch(() => null);
      const message = body && typeof body.error === 'string' ? body.error : res.statusText;
      throw new Error(`API error: ${res.status} ${message}`);
    }

    return res.json() as Promise<T>;
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  // Auth APIs
  async signup(handle: string, displayName: string): Promise<{ user: User; token: string }> {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ handle, displayName }),
    });
  }

  async login(handle: string): Promise<{ user: User; token: string }> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    });
  }

  async getMe(): Promise<User> {
    const { user } = await this.request<{ user: User }>('/api/auth/me');
    return user;
  }

  async getCurrentPrompt(): Promise<{ prompt: Prompt; state: PromptState }> {
    return this.request('/api/prompts/current');
  }

  async getPrompt(id: string): Promise<{ prompt: Prompt; state: PromptState }> {
    return this.request(`/api/prompts/${id}`);
  }

  async getField(promptId: string): Promise<FieldSticker[]> {
    const { stickers } = await this.request<{ stickers: FieldSticker[] }>(
      `/api/prompts/${promptId}/field`,
    );
    return stickers;
  }

  async getOwnSubmission(promptId: string): Promise<Sticker | null> {
    const result = await this.request<{ submitted: boolean; sticker?: Sticker }>(
      `/api/prompts/${promptId}/stickers/me`,
    );
    return result.submitted && result.sticker ? result.sticker : null;
  }

  async submitSticker(promptId: string, pixels: number[]): Promise<Sticker> {
    const { sticker } = await this.request<{ sticker: Sticker }>(
      `/api/prompts/${promptId}/stickers`,
      {
        method: 'POST',
        body: JSON.stringify({ pixels }),
      },
    );
    return sticker;
  }

  async saveSticker(stickerId: string, via: 'plaza' | 'chat'): Promise<void> {
    await this.request(`/api/stickers/${stickerId}/save`, {
      method: 'POST',
      body: JSON.stringify({ via }),
    });
  }

  async getMessages(before?: string, limit = 50): Promise<Message[]> {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', String(limit));
    const { messages } = await this.request<{ messages: Message[] }>(
      `/api/messages?${params.toString()}`,
    );
    return messages;
  }

  async sendMessage(
    body: { kind: 'text'; body: string } | { kind: 'sticker'; stickerId: string },
  ): Promise<Message> {
    const { message } = await this.request<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return message;
  }

  async getCollections(): Promise<FieldSticker[]> {
    const { collections } = await this.request<{ collections: FieldSticker[] }>(
      '/api/users/me/collections',
    );
    return collections;
  }

  async getCreated(): Promise<FieldSticker[]> {
    const { created } = await this.request<{ created: FieldSticker[] }>('/api/users/me/created');
    return created;
  }

  async getTray(): Promise<Sticker[]> {
    const { tray } = await this.request<{ tray: Sticker[] }>('/api/users/me/tray');
    return tray;
  }

  async updateMe(patch: { displayName?: string }): Promise<User> {
    const { user } = await this.request<{ user: User }>('/api/users/me', {
      method: 'PATCH',
      // backendはsnake_caseの display_name をbodyキーとして期待する。
      body: JSON.stringify({ display_name: patch.displayName }),
    });
    return user;
  }
}

export const apiClient = new ApiClient();
