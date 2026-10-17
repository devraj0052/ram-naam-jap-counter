import {
  AuthResponse,
  User,
  UserPreferences,
  SyncPushPayload,
  SyncPullResponse,
  CountEvent,
} from '../types/shared';

const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('ramjap_auth_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ramjap_auth_token', token);
    } else {
      localStorage.removeItem('ramjap_auth_token');
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('ramjap_auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // Auth Methods
  public async register(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    return this.request<{
      message: string;
      email: string;
      userId: string;
      isVerified: boolean;
      simulated?: boolean;
      devOtp?: string;
    }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  }

  public async verifyEmail(payload: { email: string; code?: string; token?: string }) {
    return this.request<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async resendVerification(email: string) {
    return this.request<{ message: string; simulated?: boolean; devOtp?: string }>(
      '/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  public async login(payload: { email: string; password: string }) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async forgotPassword(email: string) {
    return this.request<{ message: string; simulated?: boolean; devOtp?: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  }

  public async resetPassword(payload: { email: string; code?: string; token?: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMe() {
    return this.request<{ user: User & { totalCount: number }; preferences: UserPreferences }>('/auth/me');
  }

  public async logout() {
    try {
      await this.request<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      this.setToken(null);
    }
  }

  public async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updatePreferences(payload: Partial<UserPreferences>) {
    return this.request<{ message: string; preferences: UserPreferences }>('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async deleteAccount(password: string) {
    return this.request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }

  public async getDevRecentEmails() {
    return this.request<{ count: number; emails: any[] }>('/auth/dev/recent-emails');
  }

  public async getSmtpStatus() {
    return this.request<{
      status: { isConfigured: boolean; provider: string; from: string; user: string };
      connectionTest: { ok: boolean; message: string; details?: any };
    }>('/auth/smtp-status');
  }

  public async testSmtp(testEmail: string) {
    return this.request<{ message: string; result: any }>('/auth/test-smtp', {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    });
  }

  // Cloud Sync Methods
  public async pushSync(payload: SyncPushPayload) {
    return this.request<SyncPullResponse>('/sync/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async pullSync() {
    return this.request<SyncPullResponse>('/sync/pull');
  }

  public async getStats() {
    return this.request<SyncPullResponse>('/sync/stats');
  }

  public async getHistory(params?: { page?: number; limit?: number; startDate?: string; endDate?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    return this.request<{
      items: CountEvent[];
      totalItems: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/sync/history${qs ? '?' + qs : ''}`);
  }

  public async exportData() {
    return this.request<any>('/sync/export');
  }

  public async importData(payload: { jsonString?: string; legacyString?: string }) {
    return this.request<{ message: string; totalCount: number } & SyncPullResponse>('/sync/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
