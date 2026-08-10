/**
 * Customer Foreground Location Service
 * One-shot foreground location lookup for Customer discovery/search. Deliberately
 * separate from features/location/services/tracking.service.ts, which is
 * Barber-side continuous foreground tracking for an active home-service booking --
 * discovery only ever needs a single current position, never watchPositionAsync,
 * and never background permission.
 */

import * as Location from 'expo-location';

export type CustomerLocationResult =
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied' }
  | { status: 'unavailable'; message: string };

export const customerLocationService = {
  /**
   * Request foreground permission (if not already granted) and fetch the
   * Customer's current position once. Never requests background permission and
   * never starts a continuous watcher.
   */
  async getCurrentLocation(): Promise<CustomerLocationResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { status: 'denied' };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        status: 'granted',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[CustomerLocationService getCurrentLocation Error]', error?.message || error);
      }
      return {
        status: 'unavailable',
        message: error?.message || 'Gagal mendapatkan lokasi saat ini.',
      };
    }
  },
};
