/**
 * Foreground Location Tracking Service
 * Manages Barber GPS writes and participant-scoped Firestore subscriptions.
 */

import * as Location from 'expo-location';
import { doc, getDoc, onSnapshot, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

import type { BookingTracking } from '@/features/bookings/types/booking';
import { firebaseAuth, firestore } from '@/lib/firebase';
import {
  buildTrackingStartPayload,
  buildTrackingTransitionPayload,
  mapTrackingDocument,
  type TrackingCoordinates,
  type TrackingParticipants,
} from './tracking.model';

export const STALE_LOCATION_THRESHOLD_MS = 2 * 60 * 1000;
const MIN_WRITE_INTERVAL_MS = 5000;

export type LocationUpdatePayload = TrackingCoordinates;

interface TrackingBookingData {
  customerId?: unknown;
  barberId?: unknown;
  status?: unknown;
  paymentStatus?: unknown;
  serviceLocationType?: unknown;
  bookingType?: unknown;
}

class TrackingService {
  private activeWatcher: Location.LocationSubscription | null = null;
  private currentBookingId: string | null = null;
  private lastWriteTimestamp = 0;

  private clearWatcher() {
    if (this.activeWatcher) {
      try {
        this.activeWatcher.remove();
      } catch {
        // The native subscription may already be removed during teardown.
      }
      this.activeWatcher = null;
    }
    this.currentBookingId = null;
  }

  private async resolveParticipants(bookingId: string): Promise<TrackingParticipants> {
    const authenticatedBarberId = firebaseAuth.currentUser?.uid;
    if (!authenticatedBarberId) throw new Error('Pengguna tidak terautentikasi.');

    const bookingSnapshot = await getDoc(doc(firestore, 'bookings', bookingId));
    if (!bookingSnapshot.exists()) throw new Error('Booking tidak ditemukan.');

    const booking = bookingSnapshot.data() as TrackingBookingData;
    if (booking.barberId !== authenticatedBarberId) {
      throw new Error('Booking ini tidak ditugaskan kepada akun Barber yang aktif.');
    }
    if (typeof booking.customerId !== 'string' || !booking.customerId) {
      throw new Error('Identitas pelanggan pada booking tidak valid.');
    }
    if (booking.paymentStatus !== 'paid' || booking.status !== 'accepted') {
      throw new Error('Tracking hanya dapat dimulai untuk booking diterima dan sudah dibayar.');
    }
    if (booking.serviceLocationType !== 'customer_home' && booking.bookingType !== 'home') {
      throw new Error('Tracking hanya tersedia untuk layanan di rumah pelanggan.');
    }

    return {
      bookingId,
      customerId: booking.customerId,
      barberId: authenticatedBarberId,
    };
  }

  private toCoordinates(location: Location.LocationObject): TrackingCoordinates {
    const { latitude, longitude, accuracy, heading, speed } = location.coords;
    return {
      latitude,
      longitude,
      accuracy: accuracy ?? undefined,
      heading: heading ?? undefined,
      speed: speed ?? undefined,
    };
  }

  /** Start the canonical inactive -> en_route transition and foreground watcher. */
  async startBarberTracking(
    bookingId: string,
    onLocationUpdate?: (payload: LocationUpdatePayload) => void,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.currentBookingId && this.currentBookingId !== bookingId) {
        await this.stopBarberTracking(this.currentBookingId);
      } else {
        this.clearWatcher();
      }

      const participants = await this.resolveParticipants(bookingId);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Izin lokasi tidak diberikan. Harap aktifkan izin lokasi di pengaturan perangkat.',
        };
      }

      // Persist an initial, rule-complete document before reporting success. This
      // avoids waiting for the first native watcher callback on a physical device.
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const initialPayload = this.toCoordinates(initialLocation);
      await setDoc(
        doc(firestore, 'bookingTracking', bookingId),
        buildTrackingStartPayload(participants, initialPayload, Timestamp.now()),
        { merge: true },
      );
      onLocationUpdate?.(initialPayload);
      this.lastWriteTimestamp = Date.now();
      this.currentBookingId = bookingId;

      this.activeWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: MIN_WRITE_INTERVAL_MS,
          distanceInterval: 10,
        },
        (location) => {
          const payload = this.toCoordinates(location);
          onLocationUpdate?.(payload);

          const now = Date.now();
          if (now - this.lastWriteTimestamp >= MIN_WRITE_INTERVAL_MS) {
            this.lastWriteTimestamp = now;
            void this.updateTrackingLocation(bookingId, payload);
          }
        },
      );

      return { success: true };
    } catch (error: any) {
      this.clearWatcher();
      if (__DEV__) {
        console.warn('[TrackingService startBarberTracking Error]', error?.message || error);
      }
      return { success: false, error: error?.message || 'Gagal memulai pelacakan lokasi.' };
    }
  }

  /** Refresh coordinates without changing trackingStatus. */
  private async updateTrackingLocation(bookingId: string, payload: LocationUpdatePayload) {
    try {
      await updateDoc(doc(firestore, 'bookingTracking', bookingId), {
        location: { latitude: payload.latitude, longitude: payload.longitude },
        accuracy: payload.accuracy ?? null,
        heading: payload.heading ?? null,
        speed: payload.speed ?? null,
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[TrackingService updateTrackingLocation Error]', error?.message || error);
      }
    }
  }

  async markBarberArrived(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resolveParticipants(bookingId);
      const trackingRef = doc(firestore, 'bookingTracking', bookingId);
      const snapshot = await getDoc(trackingRef);
      if (!snapshot.exists()) throw new Error('Tracking keberangkatan belum dimulai.');

      const current = mapTrackingDocument(bookingId, snapshot.data()).tracking.trackingStatus;
      await updateDoc(
        trackingRef,
        buildTrackingTransitionPayload(current, 'arrived', Timestamp.now()),
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Gagal mencatat kedatangan.' };
    }
  }

  /** Stop native updates and persist the terminal tracking state. */
  async stopBarberTracking(bookingId?: string): Promise<{ success: boolean; error?: string }> {
    const targetBookingId = bookingId || this.currentBookingId;
    this.clearWatcher();
    if (!targetBookingId) return { success: true };

    try {
      const trackingRef = doc(firestore, 'bookingTracking', targetBookingId);
      const snapshot = await getDoc(trackingRef);
      if (!snapshot.exists()) return { success: true };

      const current = mapTrackingDocument(targetBookingId, snapshot.data()).tracking.trackingStatus;
      if (current === 'stopped') return { success: true };
      await updateDoc(
        trackingRef,
        buildTrackingTransitionPayload(current, 'stopped', Timestamp.now()),
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Gagal menghentikan pelacakan.' };
    }
  }

  /**
   * Subscribe to bookingTracking/{bookingId}. The returned cleanup is idempotent,
   * and the listener self-releases after receiving terminal `stopped` state.
   */
  subscribeToTracking(
    bookingId: string,
    onData: (tracking: BookingTracking | null, isStale: boolean) => void,
  ): () => void {
    if (!bookingId) {
      onData(null, false);
      return () => {};
    }

    let unsubscribeSnapshot: (() => void) | null = null;
    let stopAfterAttach = false;
    const cleanup = () => {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = null;
    };

    unsubscribeSnapshot = onSnapshot(
      doc(firestore, 'bookingTracking', bookingId),
      (snapshot) => {
        if (!snapshot.exists()) {
          onData(null, false);
          return;
        }

        try {
          const mapped = mapTrackingDocument(bookingId, snapshot.data());
          onData(mapped.tracking, mapped.isStale);
          if (mapped.tracking.trackingStatus === 'stopped') {
            if (unsubscribeSnapshot) cleanup();
            else stopAfterAttach = true;
          }
        } catch (error: any) {
          if (__DEV__) {
            console.warn('[TrackingService invalid tracking snapshot]', error?.message || error);
          }
          onData(null, true);
        }
      },
      (error) => {
        if (__DEV__) {
          console.warn('[TrackingService subscribeToTracking Error]', error?.message || error);
        }
        onData(null, true);
      },
    );

    if (stopAfterAttach) cleanup();
    return cleanup;
  }
}

export const trackingService = new TrackingService();
