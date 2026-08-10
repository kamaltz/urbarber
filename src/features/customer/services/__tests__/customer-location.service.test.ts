/**
 * Unit Tests for Customer Foreground Location Service (Batch 10B-4)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestForegroundPermissionsAsyncMock = vi.fn();
const getCurrentPositionAsyncMock = vi.fn();

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => requestForegroundPermissionsAsyncMock(),
  getCurrentPositionAsync: (options: unknown) => getCurrentPositionAsyncMock(options),
  Accuracy: { Balanced: 3 },
}));

import { customerLocationService } from '../customer-location.service';

describe('customerLocationService.getCurrentLocation', () => {
  beforeEach(() => {
    requestForegroundPermissionsAsyncMock.mockReset();
    getCurrentPositionAsyncMock.mockReset();
  });

  it('D. returns granted with the real device coordinates when permission is granted', async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'granted' });
    getCurrentPositionAsyncMock.mockResolvedValue({
      coords: { latitude: -7.5, longitude: 108.1 },
    });

    const result = await customerLocationService.getCurrentLocation();

    expect(result).toEqual({ status: 'granted', latitude: -7.5, longitude: 108.1 });
    expect(getCurrentPositionAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('E. returns denied (not a fabricated position) when permission is denied', async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'denied' });

    const result = await customerLocationService.getCurrentLocation();

    expect(result).toEqual({ status: 'denied' });
    expect(getCurrentPositionAsyncMock).not.toHaveBeenCalled();
  });

  it('returns unavailable (not a fabricated position) when the position lookup throws', async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'granted' });
    getCurrentPositionAsyncMock.mockRejectedValue(new Error('Location provider unavailable'));

    const result = await customerLocationService.getCurrentLocation();

    expect(result.status).toBe('unavailable');
  });

  it('never requests background permission and never starts a continuous watcher', async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'granted' });
    getCurrentPositionAsyncMock.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    await customerLocationService.getCurrentLocation();

    expect(requestForegroundPermissionsAsyncMock).toHaveBeenCalledTimes(1);
    expect(getCurrentPositionAsyncMock).toHaveBeenCalledTimes(1);
  });
});
