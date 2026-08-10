/**
 * Discovery & Nearby Barber Search Service
 * Performs geohash range queries against Cloud Firestore, deduplicates results, filters by distance,
 * enforces listing & operational constraints, and sorts by proximity.
 *
 * Canonical discoverable-Barber eligibility (must stay consistent with
 * customerRepository.getPublicBarbers and Firestore rules):
 *   verificationStatus == 'approved'
 *   listingStatus == 'active' (or unset, for legacy docs)
 *   acceptingNewBookings != false
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { BarberProfile } from '@/features/barbers/types/barber';
import { calculateDistanceKm, getGeohashBounds, validateCoordinates } from '../utils/geo.utils';
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

/**
 * 'ok': the primary geohash-bounded query ran without error for every bound.
 * 'primary_query_failed': the primary query threw for at least one bound (e.g. a
 *   missing Firestore composite index) and a fallback query was used instead --
 *   `results` may still be populated or legitimately empty.
 * 'error': every query path failed (fallback included); `results` is forced empty
 *   and this must NOT be presented to the user as "no barbers nearby".
 */
export type DiscoveryQueryStatus = 'ok' | 'primary_query_failed' | 'error';

export interface SearchNearbyBarbersResponse {
  results: NearbyBarberResult[];
  queryStatus: DiscoveryQueryStatus;
}

function isEligibleListing(data: any): boolean {
  // Fail-closed: the canonical publicly-discoverable value is exactly 'active'.
  // A missing field is NOT treated as eligible -- this matches
  // customerRepository.getPublicBarbers()'s Firestore where('listingStatus','==','active'),
  // which likewise never matches a document where the field is absent.
  return data.listingStatus === 'active';
}

function isEligibleVerification(data: any): boolean {
  // Fail-closed: verified is trusted-backend/Admin-authoritative (set alongside
  // verificationStatus during approve/reject). A missing field is NOT treated as
  // verified -- matches getPublicBarbers()'s where('verified','==',true).
  return data.verified === true;
}

export const discoveryService = {
  /**
   * Search nearby approved, active barbers using Firestore geohash bounds.
   */
  async searchNearbyBarbers(params: SearchNearbyBarbersParams): Promise<SearchNearbyBarbersResponse> {
    if (!validateCoordinates(params.latitude, params.longitude)) {
      if (__DEV__) {
        console.warn('[DiscoveryService] Rejected invalid search coordinates', params.latitude, params.longitude);
      }
      return { results: [], queryStatus: 'error' };
    }

    const radiusKm = params.radiusKm || MAP_CONFIG.defaultRadiusKm;
    const center: [number, number] = [params.latitude, params.longitude];

    let bounds: [string, string][];
    try {
      bounds = getGeohashBounds(center, radiusKm);
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[DiscoveryService] Failed to compute geohash bounds', err?.message || err);
      }
      return { results: [], queryStatus: 'error' };
    }

    const docsMap = new Map<string, any>();
    const barbersRef = collection(firestore, 'barbers');

    // 1. Primary query: geohash-bounded, scoped to canonical eligibility fields.
    let primaryQueryFailed = false;
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
      } catch (err: any) {
        primaryQueryFailed = true;
        if (__DEV__) {
          console.warn(
            '[DiscoveryService] PRIMARY_GEO_QUERY_FAILED (likely a missing Firestore composite index: verificationStatus, listingStatus, geohash)',
            err?.code,
            err?.message || err
          );
        }
      }
    }

    // 2. Fallback: drop the geohash range so legacy docs without geohash are still
    // reachable, and so a missing composite index doesn't hide every barber.
    let fallbackFailed = false;
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
      } catch (err: any) {
        try {
          // 3. Last-resort generic scan, filtered client-side, in case status field
          // naming/casing varies on legacy docs.
          const genericQuery = query(barbersRef);
          const genericSnap = await getDocs(genericQuery);
          for (const docSnap of genericSnap.docs) {
            const d = docSnap.data();
            if (d.verificationStatus === 'approved' && isEligibleListing(d) && isEligibleVerification(d)) {
              docsMap.set(docSnap.id, { id: docSnap.id, ...d });
            }
          }
        } catch (genericErr: any) {
          fallbackFailed = true;
          if (__DEV__) {
            console.warn('[DiscoveryService] All discovery query paths failed', genericErr?.code, genericErr?.message || genericErr);
          }
        }
      }
    }

    if (fallbackFailed) {
      return { results: [], queryStatus: 'error' };
    }

    // 4. Process, filter, and calculate exact Haversine distance.
    const results: NearbyBarberResult[] = [];

    for (const [id, data] of docsMap.entries()) {
      if (!isEligibleListing(data)) continue;
      if (!isEligibleVerification(data)) continue;
      if (data.acceptingNewBookings === false) continue;

      if (params.serviceType === 'barbershop' && data.acceptsAtBarbershop === false) continue;
      if (params.serviceType === 'customer_home' && data.acceptsHomeService === false) continue;

      if (params.categoryId && data.serviceTypes && Array.isArray(data.serviceTypes)) {
        if (!data.serviceTypes.includes(params.categoryId)) continue;
      }

      if (params.searchQuery && params.searchQuery.trim()) {
        const qLower = params.searchQuery.trim().toLowerCase();
        const nameMatch = data.displayName?.toLowerCase().includes(qLower) || data.name?.toLowerCase().includes(qLower);
        const shopMatch = data.shopName?.toLowerCase().includes(qLower);
        if (!nameMatch && !shopMatch) continue;
      }

      const hasLocation = !!(data.location?.latitude && data.location?.longitude);
      const hasFlatLocation = !!(data.latitude && data.longitude);

      let dist = 0;
      if (hasLocation) {
        dist = calculateDistanceKm(params.latitude, params.longitude, data.location.latitude, data.location.longitude);
      } else if (hasFlatLocation) {
        dist = calculateDistanceKm(params.latitude, params.longitude, data.latitude, data.longitude);
      }

      // Only enforce the radius bound against candidates that actually have
      // coordinates -- a barber with no location data has no distance to judge,
      // and would otherwise be silently dropped by the same check that filters
      // false positives from a wide geohash bound.
      if ((hasLocation || hasFlatLocation) && dist > radiusKm && bounds.length > 0) continue;

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

    // 5. Sort by actual straight-line distance ascending.
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      results,
      queryStatus: primaryQueryFailed ? 'primary_query_failed' : 'ok',
    };
  },
};
