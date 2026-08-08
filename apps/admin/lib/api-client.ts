import { firebaseAuth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success?: boolean;
}

export interface AdminIdentity {
  uid: string;
  email: string;
  appRole: 'admin';
  status: 'active';
  displayName?: string;
}

export class AdminApiClient {
  private static async getAuthToken(): Promise<string> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Not authenticated. Please log in.');
    }
    return user.getIdToken(false);
  }

  static async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const error = data?.error || { code: 'UNKNOWN_ERROR', message: 'Request failed' };
      const err = new Error(error.message);
      (err as any).code = error.code;
      (err as any).status = response.status;
      throw err;
    }

    return data;
  }

  /**
   * GET /api/admin/me
   * Verify authentication and load current admin identity
   */
  static async getAdminIdentity(): Promise<AdminIdentity> {
    const response = await this.request<ApiResponse<AdminIdentity>>('/api/admin/me', {
      method: 'GET',
    });
    return response.data!;
  }
}
