/**
 * Foreground Location Tracking Service
 * Manages watchPositionAsync foreground GPS tracking for barbers and Firestore real-time subscriptions for customers.
 */

import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import { firestore } from '@/lib/firebase';
import { BookingTracking } from '@/features/bookings/types/booking';

export const STALE_LOCATION_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

class TrackingService {
  private activeWatcher: Location.LocationSubscription | null = null;
  private currentBookingId: string | null = null;
  private lastWriteTimestamp = 0;
  private MIN_WRITE_INTERVAL_MS = 5000; // Throttle Firestore writes to at most once per 5 seconds

  /**
   * Start foreground location tracking for assigned barber on an active home-service booking
   */
  async startBarberTracking(
    bookingId: string,
    customerId: string,
    barberId: string,
    onLocationUpdate?: (payload: LocationUpdatePayload) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Clean up any existing active watcher
      await this.stopBarberTracking();

      // 2. Check foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Izin lokasi tidak diberikan. Harap aktifkan izin lokasi di pengaturan perangkat.',
        };
      }

      this.currentBookingId = bookingId;

      // 3. Start watchPositionAsync with balanced accuracy
      this.activeWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location: Location.LocationObject) => {
          const { latitude, longitude, accuracy, heading, speed } = location.coords;
          const payload: LocationUpdatePayload = {
            latitude,
            longitude,
            accuracy: accuracy || undefined,
            heading: heading || undefined,
            speed: speed || undefined,
          };

          if (onLocationUpdate) {
            onLocationUpdate(payload);
          }

          // Throttle Firestore updates
          const now = Date.now();
          if (now - this.lastWriteTimestamp >= this.MIN_WRITE_INTERVAL_MS) {
            this.lastWriteTimestamp = now;
            await this.updateTrackingLocation(bookingId, customerId, barberId, payload);
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[TrackingService startBarberTracking Error]', error?.message || error);
      }
      return {
        success: false,
        error: error?.message || 'Gagal memulai pelacakan lokasi.',
      };
    }
  }

  /**
   * Directly write throttled GPS update to bookingTracking/{bookingId}
   */
  private async updateTrackingLocation(
    bookingId: string,
    customerId: string,
    barberId: string,
    payload: LocationUpdatePayload
  ) {
    try {
      const docRef = doc(firestore, 'bookingTracking', bookingId);
      await setDoc(
        docRef,
        {
          bookingId,
          customerId,
          barberId,
          trackingStatus: 'en_route',
          isActive: true,
          location: {
            latitude: payload.latitude,
            longitude: payload.longitude,
          },
          accuracy: payload.accuracy || null,
          heading: payload.heading || null,
          speed: payload.speed || null,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[TrackingService updateTrackingLocation Error]', error?.message || error);
      }
    }
  }

  /**
   * Stop foreground tracking watcher for barber
   */
  async stopBarberTracking(): Promise<void> {
    if (this.activeWatcher) {
      try {
        this.activeWatcher.remove();
      } catch (err) {
        // Ignore removal error
      }
      this.activeWatcher = null;
    }
    this.currentBookingId = null;
  }

  /**
   * Real-time listener for customer order tracking
   */
  subscribeToTracking(
    bookingId: string,
    onData: (tracking: BookingTracking | null, isStale: boolean) => void
  ): () => void {
    if (!bookingId) {
      onData(null, false);
      return () => {};
    }

    const docRef = doc(firestore, 'bookingTracking', bookingId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onData(null, false);
          return;
        }

        const data = docSnap.data();
        const updatedAtDate = data.updatedAt?.toDate?.() || new Date();
        const isStale = Date.now() - updatedAtDate.getTime() > STALE_LOCATION_THRESHOLD_MS;

        const tracking: BookingTracking = {
          bookingId: data.bookingId,
          customerId: data.customerId,
          barberId: data.barberId,
          trackingStatus: data.trackingStatus || 'inactive',
          isActive: !!data.isActive,
          location: data.location,
          accuracy: data.accuracy,
          heading: data.heading,
          speed: data.speed,
          startedAt: data.startedAt?.toDate?.()?.toISOString(),
          updatedAt: updatedAtDate.toISOString(),
          stoppedAt: data.stoppedAt?.toDate?.()?.toISOString(),
          expiresAt: data.expiresAt?.toDate?.()?.toISOString(),
        };

        onData(tracking, isStale);
      },
      (error) => {
        if (__DEV__) {
          console.warn('[TrackingService subscribeToTracking Error]', error?.message || error);
        }
        onData(null, true);
      }
    );

    return unsubscribe;
  }
}

export const trackingService = new TrackingService();
