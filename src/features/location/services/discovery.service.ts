/**
 * Discovery & Nearby Barber Search Service
 * Performs geohash range queries against Cloud Firestore, deduplicates results, filters by distance,
 * enforces listing & operational constraints, and sorts by proximity.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { BarberProfile } from '@/features/barbers/types/barber';
import { calculateDistanceKm, getGeohashBounds } from '../utils/geo.utils';
import { MAP_CONFIG } from '@/config/map.config';

export interface SearchNearbyBarbersParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  serviceType?: 'barbershop' | 'customer_home';
  categoryId?: string;
  searchQuery?: string;
}

export interface NearbyBarberResult {
  barber: BarberProfile;
  distanceKm: number;
  formattedDistance: string;
}

export const discoveryService = {
  /**
   * Search nearby approved, active, public barbers using Firestore geohash bounds
   */
  async searchNearbyBarbers(params: SearchNearbyBarbersParams): Promise<NearbyBarberResult[]> {
    try {
      const radiusKm = params.radiusKm || MAP_CONFIG.defaultRadiusKm;
      const center: [number, number] = [params.latitude, params.longitude];

      // 1. Get geohash query bounds for center and radius
      const bounds = getGeohashBounds(center, radiusKm);
      const docsMap = new Map<string, any>();

      const barbersRef = collection(firestore, 'barbers');

      // 2. Query Firestore for each geohash bound with security rules visibility constraints
      for (const b of bounds) {
        try {
          const q = query(
            barbersRef,
            where('verificationStatus', '==', 'approved'),
            where('listingStatus', '==', 'active'),
            where('geohash', '>=', b[0]),
            where('geohash', '<=', b[1])
          );

          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            docsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        } catch {
          // Ignore individual geohash query bounds errors
        }
      }

      // If geohash query returned empty (e.g. legacy docs without geohash), fallback query
      if (docsMap.size === 0) {
        try {
          const fallbackQuery = query(
            barbersRef,
            where('verificationStatus', '==', 'approved'),
            where('listingStatus', '==', 'active')
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          for (const docSnap of fallbackSnap.docs) {
            docsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        } catch {
          try {
            // General fallback query if status field filtering varies
            const genericQuery = query(barbersRef);
            const genericSnap = await getDocs(genericQuery);
            for (const docSnap of genericSnap.docs) {
              const d = docSnap.data();
              if (d.verificationStatus === 'approved' && d.status === 'active') {
                docsMap.set(docSnap.id, { id: docSnap.id, ...d });
              }
            }
          } catch {}
        }
      }

      // 3. Process, filter, and calculate exact Haversine distance
      const results: NearbyBarberResult[] = [];

      for (const [id, data] of docsMap.entries()) {
        // Enforce listing & accepting new bookings constraints
        if (data.listingStatus && data.listingStatus !== 'public') continue;
        if (data.acceptingNewBookings === false) continue;

        // Enforce service type compatibility if specified
        if (params.serviceType === 'barbershop' && data.acceptsAtBarbershop === false) continue;
        if (params.serviceType === 'customer_home' && data.acceptsHomeService === false) continue;

        // Category filter if specified
        if (params.categoryId && data.serviceTypes && Array.isArray(data.serviceTypes)) {
          if (!data.serviceTypes.includes(params.categoryId)) continue;
        }

        // Text query filter (name or shop name)
        if (params.searchQuery && params.searchQuery.trim()) {
          const qLower = params.searchQuery.trim().toLowerCase();
          const nameMatch = data.displayName?.toLowerCase().includes(qLower) || data.name?.toLowerCase().includes(qLower);
          const shopMatch = data.shopName?.toLowerCase().includes(qLower);
          if (!nameMatch && !shopMatch) continue;
        }

        // Calculate distance
        let dist = 0;
        if (data.location?.latitude && data.location?.longitude) {
          dist = calculateDistanceKm(
            params.latitude,
            params.longitude,
            data.location.latitude,
            data.location.longitude
          );
        } else if (data.latitude && data.longitude) {
          dist = calculateDistanceKm(
            params.latitude,
            params.longitude,
            data.latitude,
            data.longitude
          );
        }

        // Enforce maximum distance bound (filter false positives)
        if (dist > radiusKm && bounds.length > 0) continue;

        // Verify serviceRadiusKm if barber has set home service radius limits
        if (params.serviceType === 'customer_home' && data.serviceRadiusKm) {
          if (dist > data.serviceRadiusKm) continue;
        }

        const profile: BarberProfile = {
          barberId: id,
          name: data.displayName || data.name || 'Master Barber',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          profileImageUrl: data.profileImageUrl,
          profileImagePath: data.profileImagePath,
          shopName: data.shopName || data.displayName || 'Barbershop',
          shopDescription: data.shopDescription || data.description || '',
          shopAddress: data.shopAddress || data.address || '',
          shopImageUrl: data.shopImageUrl,
          location: data.location || (data.latitude ? { latitude: data.latitude, longitude: data.longitude } : undefined),
          geohash: data.geohash,
          serviceRadiusKm: data.serviceRadiusKm || 10,
          acceptsAtBarbershop: data.acceptsAtBarbershop ?? true,
          acceptsHomeService: data.acceptsHomeService ?? true,
          homeServiceTravelBufferMinutes: data.homeServiceTravelBufferMinutes || 15,
          acceptingNewBookings: data.acceptingNewBookings ?? true,
          isVerified: data.verified ?? true,
          verificationStatus: data.verificationStatus || 'approved',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };

        results.push({
          barber: profile,
          distanceKm: dist,
          formattedDistance: dist > 0 ? `~${dist} km` : 'Lokasi Barber',
        });
      }

      // 4. Sort by actual straight-line distance ascending
      return results.sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[DiscoveryService searchNearbyBarbers Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },
};
