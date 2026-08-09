/**
 * Availability API Service for Expo Client
 * Calls the trusted Vercel backend availability endpoint (GET /api/bookings/availability).
 *
 * Public/unauthenticated by design (mirrors public barber-profile/schedule browsing) --
 * see backend/vercel/src/bookings/availability.ts. Replaces the deprecated direct
 * Firestore query in bookingRepository.getAvailableSlots(), which required broad read
 * access to other customers' booking documents and is incompatible with participant-only
 * booking Firestore rules.
 */

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export interface AvailabilitySlotDto {
  time: string;
  available: boolean;
}

export interface AvailabilityResponse {
  success: boolean;
  barberId: string;
  date: string;
  slots: AvailabilitySlotDto[];
  error?: string;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

class AvailabilityApiService {
  async getAvailability(
    barberId: string,
    date: string,
    options?: { serviceDurationMinutes?: number; isHomeService?: boolean }
  ): Promise<{ success: true; data: AvailabilityResponse } | { success: false; error: { code: string; message: string } }> {
    try {
      const params = new URLSearchParams({ barberId, date });
      if (options?.serviceDurationMinutes) {
        params.set('serviceDurationMinutes', String(options.serviceDurationMinutes));
      }
      if (options?.isHomeService) {
        params.set('isHomeService', 'true');
      }

      const url = `${BASE_URL.replace(/\/$/, '')}/api/bookings/availability?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = (await response.json()) as AvailabilityResponse & ApiErrorResponse;

      if (!response.ok) {
        const errMessage = json?.error?.message || `Gagal menghubungi server (${response.status})`;
        const errCode = json?.error?.code || 'API_ERROR';
        return { success: false, error: { code: errCode, message: errMessage } };
      }

      return { success: true, data: json };
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
}

export const availabilityApiService = new AvailabilityApiService();
