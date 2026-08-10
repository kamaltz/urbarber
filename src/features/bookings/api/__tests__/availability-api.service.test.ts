/**
 * Unit Tests for Availability API Service
 * Regression guard for Batch 10B-2: a stale/misrouted deployment previously returned a
 * platform text/plain 404 for GET /api/bookings/availability, which crashed the client's
 * response.json() call with "Unexpected character" instead of a controlled error. These
 * tests pin the expected behavior against a healthy backend (application JSON, success
 * and structured-error cases) and against a non-JSON platform response.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { availabilityApiService } from '../availability-api.service';

describe('AvailabilityApiService.getAvailability', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('D1. a healthy backend returns application JSON with slots parsed correctly', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        barberId: 'barber-1',
        date: '2026-08-10',
        slots: [{ time: '09:00', available: true }],
      }),
    });

    const result = await availabilityApiService.getAvailability('barber-1', '2026-08-10');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slots).toEqual([{ time: '09:00', available: true }]);
    }
  });

  it('D2. a healthy backend structured application error (e.g. invalid barberId) is surfaced cleanly', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'INVALID_ARGUMENT', message: 'barberId wajib diisi.' } }),
    });

    const result = await availabilityApiService.getAvailability('', '2026-08-10');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual({ code: 'INVALID_ARGUMENT', message: 'barberId wajib diisi.' });
    }
  });

  it('D3. a non-JSON platform response (e.g. a stale deployment\'s text/plain 404) is caught as a controlled error, not an unhandled parse crash', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError('Unexpected character: T');
      },
    });

    const result = await availabilityApiService.getAvailability('barber-1', '2026-08-10');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NETWORK_ERROR');
    }
  });
});
