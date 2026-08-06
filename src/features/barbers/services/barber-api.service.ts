/**
 * Barber API Service for Expo Client
 * Calls trusted Vercel Backend endpoints for sensitive booking status transitions.
 */

import { firebaseAuth } from '@/lib/firebase';

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export interface BarberRespondBookingResult {
  success: boolean;
  bookingId: string;
  status: string;
  message?: string;
}

export interface BarberUpdateStatusResult {
  success: boolean;
  bookingId: string;
  status: string;
  message?: string;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

class BarberApiService {
  private async getAuthToken(): Promise<string> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Pengguna tidak terautentikasi.');
    }
    return await user.getIdToken();
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: true; data: T } | { success: false; error: { code: string; message: string } }> {
    try {
      const token = await this.getAuthToken();
      const url = `${BASE_URL.replace(/\/$/, '')}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = (await response.json()) as T & ApiErrorResponse;

      if (!response.ok) {
        const errMessage =
          json?.error?.message || `Gagal menghubungi server (${response.status})`;
        const errCode = json?.error?.code || 'API_ERROR';
        return {
          success: false,
          error: { code: errCode, message: errMessage },
        };
      }

      return { success: true, data: json as T };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: { code: 'TIMEOUT', message: 'Koneksi ke server batas waktu (timeout).' },
        };
      }
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Gagal terhubung ke layanan backend Vercel.',
        },
      };
    }
  }

  /**
   * Respond to booking request (accept or reject)
   */
  async respondBooking(bookingId: string, action: 'accept' | 'reject', reason?: string) {
    return this.fetchWithAuth<BarberRespondBookingResult>('/api/barber/bookings/respond', {
      method: 'POST',
      body: JSON.stringify({ bookingId, action, reason }),
    });
  }

  /**
   * Update service progress status (accepted -> in_progress -> completed)
   */
  async updateBookingStatus(bookingId: string, targetStatus: 'in_progress' | 'completed') {
    return this.fetchWithAuth<BarberUpdateStatusResult>('/api/barber/bookings/status', {
      method: 'POST',
      body: JSON.stringify({ bookingId, targetStatus }),
    });
  }
}

export const barberApiService = new BarberApiService();
