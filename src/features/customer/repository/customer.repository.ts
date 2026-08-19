/**
 * Firebase Customer Repository
 * Data access layer for customer profile, discovery, categories, and favorites
 */

import { MAP_CONFIG } from '@/config/map.config';
import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import {
  collection,
  deleteDoc,
  doc,
  query as firestoreQuery,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  CategoryChip,
  CustomerExploreData,
  CustomerFavoritesData,
  CustomerHomeData,
  CustomerNotification,
  CustomerProfile,
  DiscoveryQueryOutcome,
  PublicBarberSummary,
  RecentSearch,
  UpdateProfileData,
} from '../types/customer';

const DEFAULT_DISCOVERY_CENTER = {
  latitude: MAP_CONFIG.defaultViewport.latitude,
  longitude: MAP_CONFIG.defaultViewport.longitude,
};

function isOfflineError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'unavailable' || candidate.message?.toLowerCase().includes('client is offline') === true;
}

/**
 * Normalizes search text for case-insensitive keyword matching
 */
export function normalizeSearchKeyword(text?: string): string {
  return text ? text.toLowerCase().trim() : '';
}

export const customerRepository = {
  /**
   * Get active service categories from Firestore
   */
  async getCategories(): Promise<CategoryChip[]> {
    try {
      const q = firestoreQuery(
        collection(firestore, 'categories'),
        where('active', '==', true)
      );
      const snapshot = await withTimeout(getDocs(q), 5000, 'Categories fetch timed out');
      const categories = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          label: data.name || docSnap.id,
          isActive: false,
          order: data.order ?? 0,
          recommendationRule: data.recommendationRule || 'default',
        };
      });
      return categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getCategories Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Get active and verified barbers for public customer discovery
   */
  async getPublicBarbers(filters?: { categoryId?: string }): Promise<PublicBarberSummary[]> {
    try {
      const barbersRef = collection(firestore, 'barbers');
      let q = firestoreQuery(
        barbersRef,
        where('listingStatus', '==', 'active'),
        where('verified', '==', true)
      );

      if (filters?.categoryId) {
        q = firestoreQuery(
          barbersRef,
          where('listingStatus', '==', 'active'),
          where('verified', '==', true),
          where('serviceTypes', 'array-contains', filters.categoryId)
        );
      }

      const snapshot = await withTimeout(getDocs(q), 8000, 'Public barbers fetch timed out');
      const barbers = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || docSnap.id,
          displayName: data.displayName || data.name || 'Barber URBarber',
          description: data.description || data.shopDescription || '',
          address: data.address || data.shopAddress || '',
          profileImageUrl: data.profileImageUrl || data.shopImageUrl || undefined,
          profileImagePath: data.profileImagePath || undefined,
          ratingAverage: typeof data.ratingAverage === 'number' ? data.ratingAverage : 0,
          reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
          verified: data.verified === true,
          verificationStatus: data.verificationStatus || 'approved',
          status: data.status || 'active',
          serviceTypes: Array.isArray(data.serviceTypes) ? data.serviceTypes : [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        } as PublicBarberSummary;
      });

      // Sort deterministically: ratingAverage DESC, reviewCount DESC
      return barbers.sort((a, b) => {
        if (b.ratingAverage !== a.ratingAverage) {
          return b.ratingAverage - a.ratingAverage;
        }
        return b.reviewCount - a.reviewCount;
      });
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getPublicBarbers Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Get customer home data containing live active barbers & categories
   */
  async getCustomerHomeData(customerId: string): Promise<CustomerHomeData | null> {
    try {
      const { bookingRepository } = await import('@/features/bookings/repository/booking.repository');

      const [barbers, categories, activeBookings] = await Promise.all([
        this.getPublicBarbers(),
        this.getCategories(),
        bookingRepository.getActiveBookings(customerId),
      ]);

      const authUser = firebaseAuth.currentUser;
      const userName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Pelanggan';

      const barberSuggestions = barbers.map((b) => ({
        barberId: b.id,
        name: b.displayName,
        status: b.status === 'active' ? 'Tersedia' : 'Tutup',
        rating: b.ratingAverage,
        distance: 'Garut',
        imageUrl: b.profileImageUrl,
        location: b.address,
      }));

      const featuredServices = categories.map((c) => ({
        id: c.id,
        title: c.label,
        subtitle: `Layanan ${c.label}`,
      }));

      // Same real active-booking source as the booking history list (Batch
      // 10B-5G) -- a customer may have more than one active booking, so the
      // most actionable one (already in progress, then already accepted,
      // then still pending) surfaces on the Home banner.
      const activeStatusPriority: Record<string, number> = { in_progress: 0, accepted: 1, pending: 2 };
      const primaryActive = [...activeBookings].sort(
        (a, b) => (activeStatusPriority[a.status] ?? 9) - (activeStatusPriority[b.status] ?? 9)
      )[0];

      return {
        userId: customerId,
        userName,
        profileImageUrl: authUser?.photoURL || undefined,
        featuredServices,
        barberSuggestions,
        notificationCount: 0,
        activeBooking: primaryActive
          ? {
              id: primaryActive.id,
              serviceName: primaryActive.services?.[0]?.name,
              barberName: primaryActive.barber?.name,
              bookingDate: primaryActive.scheduledAt,
              bookingTime: primaryActive.scheduledTime,
              status: primaryActive.status,
            }
          : null,
      };
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getCustomerHomeData Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Search barbers with debounced text matching, category filter, and geohash discovery.
   * When filters.latitude/longitude are omitted, results are centered on a fixed
   * default area (Garut) rather than the Customer's real position -- callers must
   * surface `locationMode` so the UI never presents that as live GPS.
   */
  async searchBarbers(
    customerId: string,
    query: string,
    filters?: { category?: string; latitude?: number; longitude?: number }
  ): Promise<CustomerExploreData | null> {
    try {
      const hasRealLocation = typeof filters?.latitude === 'number' && typeof filters?.longitude === 'number';
      const lat = hasRealLocation ? (filters!.latitude as number) : DEFAULT_DISCOVERY_CENTER.latitude;
      const lng = hasRealLocation ? (filters!.longitude as number) : DEFAULT_DISCOVERY_CENTER.longitude;

      const { discoveryService } = await import('@/features/location/services/discovery.service');
      const { results: rawNearbyResults, queryStatus } = await discoveryService.searchNearbyBarbers({
        latitude: lat,
        longitude: lng,
        radiusKm: 25,
        categoryId: filters?.category,
        searchQuery: query,
      });

      const categories = await this.getCategories();

      const categoryChips: CategoryChip[] = categories.map((cat) => ({
        ...cat,
        isActive: cat.id === filters?.category,
      }));

      // Apply the selected category's Admin-configured recommendation rule.
      // Never affects eligibility -- rawNearbyResults is already fully
      // filtered by discoveryService (verificationStatus/listingStatus/
      // acceptingNewBookings); this only reorders what's already eligible.
      // Only 'nearest'/'highest_rating'/'most_popular'/'newest' have a real
      // signal available at this call site -- 'cheapest'/'history'/
      // 'soonest_available' deterministically fall back to the existing
      // distance-ascending order (see applyCategoryRecommendationRule).
      const selectedCategory = filters?.category ? categories.find((c) => c.id === filters.category) : undefined;
      const { applyCategoryRecommendationRule } = await import('@/features/location/services/recommendation-rules');
      const nearbyResults = selectedCategory
        ? applyCategoryRecommendationRule(
            rawNearbyResults.map((r) => ({
              item: r,
              distanceKm: r.distanceKm,
              ratingAverage: r.barber.ratingAverage,
              reviewCount: r.barber.reviewCount,
              createdAt: r.barber.createdAt,
            })),
            selectedCategory.recommendationRule || 'default'
          )
        : rawNearbyResults;

      const nearbyBarbers = nearbyResults.map((r) => ({
        barberId: r.barber.barberId,
        name: r.barber.name,
        imageUrl: r.barber.profileImageUrl,
        serviceType: r.barber.shopDescription || 'Grooming',
        location: r.barber.shopAddress || 'Garut',
        distance: r.formattedDistance,
        rating: r.barber.ratingAverage ?? 0,
        reviewCount: r.barber.reviewCount ?? 0,
        latitude: r.barber.location?.latitude,
        longitude: r.barber.location?.longitude,
      }));

      const first = nearbyResults[0]?.barber;
      const featured = first
        ? {
            barberId: first.barberId,
            name: first.name,
            imageUrl: first.profileImageUrl,
            location: first.shopAddress || 'Garut',
            distance: nearbyResults[0].formattedDistance,
            rating: first.ratingAverage ?? 0,
            isFavorite: false,
            serviceTags: ['Grooming'],
            reviewCount: first.reviewCount ?? 0,
          }
        : {
            barberId: '',
            name: 'Tidak ada barber',
            location: '',
            distance: '',
            rating: 0,
            isFavorite: false,
            serviceTags: [],
          };

      const queryOutcome: DiscoveryQueryOutcome =
        queryStatus === 'error' ? 'query_failed' : nearbyResults.length === 0 ? 'zero_results' : 'ok';

      return {
        userId: customerId,
        searchQuery: query,
        selectedCategory: filters?.category,
        featuredBarber: featured,
        nearbyBarbers,
        categoryChips,
        sliderPosition: 0,
        locationMode: hasRealLocation ? 'granted' : 'default_area',
        queryOutcome,
        searchCenter: { latitude: lat, longitude: lng },
      };
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository searchBarbers Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Get favorite barber IDs belonging to customer
   */
  async getFavoriteIds(customerId: string): Promise<string[]> {
    try {
      if (!customerId) return [];
      const q = firestoreQuery(
        collection(firestore, 'favorites'),
        where('customerId', '==', customerId)
      );
      const snapshot = await withTimeout(getDocs(q), 5000, 'Favorites fetch timed out');
      return snapshot.docs.map((docSnap) => (docSnap.data() as { barberId: string }).barberId);
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getFavoriteIds Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Check if a specific barber is favorited by customer
   */
  async isFavorite(customerId: string, barberId: string): Promise<boolean> {
    try {
      if (!customerId || !barberId) return false;
      const favId = `${customerId}_${barberId}`;
      const docRef = doc(firestore, 'favorites', favId);
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Get favorite barbers for customer
   */
  async getFavoriteBarbers(customerId: string): Promise<CustomerFavoritesData | null> {
    try {
      if (!customerId) return null;
      const favoriteIds = await this.getFavoriteIds(customerId);
      const allBarbers = await this.getPublicBarbers();
      const categories = await this.getCategories();

      const favoriteBarbers = allBarbers
        .filter((b) => favoriteIds.includes(b.id))
        .map((b) => ({
          barberId: b.id,
          name: b.displayName,
          status: b.status === 'active' ? 'Tersedia' : 'Tutup',
          rating: b.ratingAverage,
          distance: 'Garut',
          imageUrl: b.profileImageUrl,
          location: b.address,
        }));

      return {
        userId: customerId,
        favoriteBarbers,
        categoryChips: categories,
      };
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getFavoriteBarbers Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Toggle favorite barber using deterministic document ID favorites/{customerId}_{barberId}
   */
  async toggleFavoriteBarber(
    customerId: string,
    barberId: string
  ): Promise<{ success: boolean; isFavorite: boolean; error?: { message: string } }> {
    try {
      if (!customerId || !barberId) {
        return { success: false, isFavorite: false, error: { message: 'ID Pelanggan dan Barber diperlukan' } };
      }

      const favId = `${customerId}_${barberId}`;
      const favRef = doc(firestore, 'favorites', favId);
      const snap = await getDoc(favRef);

      if (snap.exists()) {
        await deleteDoc(favRef);
        return { success: true, isFavorite: false };
      } else {
        await setDoc(favRef, {
          id: favId,
          customerId,
          barberId,
          createdAt: Timestamp.now(),
        });
        return { success: true, isFavorite: true };
      }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[CustomerRepository toggleFavoriteBarber Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        isFavorite: false,
        error: { message: error?.message || 'Gagal mengubah status favorit' },
      };
    }
  },

  /**
   * Get customer profile matching exact registration UID from Firestore & Auth
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    const authUser = firebaseAuth.currentUser;
    const fallbackName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Pelanggan URBarber';

    try {
      if (!customerId) {
        return {
          userId: customerId,
          name: fallbackName,
          email: authUser?.email || '',
          location: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const docRef = doc(firestore, 'customers', customerId);
      const snapshot = await withTimeout(getDoc(docRef), 8000, 'Customer profile fetch timed out');

      let name = fallbackName;
      let email = authUser?.email || '';
      let profileImageUrl = authUser?.photoURL || undefined;
      let profileImagePath: string | undefined = undefined;
      let phone = authUser?.phoneNumber || undefined;
      let location = '';

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.name || data.fullName) name = data.name || data.fullName;
        if (data.email) email = data.email;
        if (data.profileImageUrl || data.profileImage || data.avatarUrl) {
          profileImageUrl = data.profileImageUrl || data.profileImage || data.avatarUrl;
        }
        if (data.profileImagePath) profileImagePath = data.profileImagePath;
        if (data.phoneNumber || data.phone) phone = data.phoneNumber || data.phone;
        if (data.location || data.address) location = data.location || data.address;
      } else {
        // Fallback check users/{uid} collection if customers/{uid} does not exist yet
        try {
          const userRef = doc(firestore, 'users', customerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.name || uData.fullName) name = uData.name || uData.fullName;
            if (uData.email) email = uData.email;
            if (uData.profileImageUrl || uData.profileImage || uData.avatarUrl) {
              profileImageUrl = uData.profileImageUrl || uData.profileImage || uData.avatarUrl;
            }
            if (uData.profileImagePath) profileImagePath = uData.profileImagePath;
            if (uData.phoneNumber || uData.phone) phone = uData.phoneNumber || uData.phone;
          }
        } catch (fallbackErr: any) {
          if (__DEV__) {
            console.warn('[Firestore users fallback error]', fallbackErr?.code, fallbackErr?.message);
          }
        }
      }

      return {
        userId: customerId,
        name,
        email,
        location,
        profileImageUrl,
        profileImagePath,
        phone,
        createdAt: snapshot.exists() ? snapshot.data()?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: snapshot.exists() ? snapshot.data()?.updatedAt || new Date().toISOString() : new Date().toISOString(),
      };
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[Firestore getCustomerProfile Error]', error?.code, error?.message || error);
      }
      return {
        userId: customerId,
        name: fallbackName,
        email: authUser?.email || '',
        location: '',
        profileImageUrl: authUser?.photoURL || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Realtime subscription to a customer's canonical name/photo (customers/{uid},
   * falling back to users/{uid} when the former doesn't exist -- same source
   * precedence as getCustomerProfile). For callers that keep a screen open
   * across a profile edit (e.g. a chat header) so it updates live.
   */
  subscribeToCustomerNameAndPhoto(
    customerId: string,
    onNext: (info: { name: string; profileImageUrl?: string } | null) => void
  ): () => void {
    if (!customerId) {
      onNext(null);
      return () => {};
    }

    const extract = (data: Record<string, any> | undefined) => {
      if (!data) return null;
      const name = data.name || data.fullName;
      const profileImageUrl = data.profileImageUrl || data.profileImage || data.avatarUrl;
      if (!name && !profileImageUrl) return null;
      return { name: name || 'Customer', profileImageUrl };
    };

    let unsubscribeUsersFallback: (() => void) | null = null;

    const unsubscribeCustomers = onSnapshot(
      doc(firestore, 'customers', customerId),
      (snapshot) => {
        const extracted = snapshot.exists() ? extract(snapshot.data()) : null;
        if (extracted) {
          onNext(extracted);
          if (unsubscribeUsersFallback) {
            unsubscribeUsersFallback();
            unsubscribeUsersFallback = null;
          }
          return;
        }
        if (!unsubscribeUsersFallback) {
          unsubscribeUsersFallback = onSnapshot(
            doc(firestore, 'users', customerId),
            (userSnapshot) => onNext(userSnapshot.exists() ? extract(userSnapshot.data()) : null),
            () => onNext(null)
          );
        }
      },
      () => onNext(null)
    );

    return () => {
      unsubscribeCustomers();
      if (unsubscribeUsersFallback) unsubscribeUsersFallback();
    };
  },

  /**
   * Update customer profile using merge-safe setDoc on customers/{uid} and users/{uid}
   */
  async updateCustomerProfile(
    customerId: string,
    data: UpdateProfileData
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!customerId) {
        return { success: false, error: { message: 'ID Pelanggan diperlukan' } };
      }

      if (!data || Object.keys(data).length === 0) {
        return { success: false, error: { message: 'Tidak ada data untuk diperbarui' } };
      }

      const docRef = doc(firestore, 'customers', customerId);
      const userRef = doc(firestore, 'users', customerId);

      const customerUpdatePayload: Record<string, any> = {
        userId: customerId,
        updatedAt: Timestamp.now(),
      };

      const userUpdatePayload: Record<string, any> = {
        uid: customerId,
        updatedAt: Timestamp.now(),
      };

      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        customerUpdatePayload.name = trimmedName;
        userUpdatePayload.name = trimmedName;
      }
      if (data.email !== undefined) {
        customerUpdatePayload.email = data.email.trim();
        userUpdatePayload.email = data.email.trim();
      }
      if (data.location !== undefined) {
        customerUpdatePayload.location = data.location.trim();
        customerUpdatePayload.address = data.location.trim();
      }
      if (data.phone !== undefined) {
        const trimmedPhone = data.phone.trim();
        customerUpdatePayload.phone = trimmedPhone;
        customerUpdatePayload.phoneNumber = trimmedPhone;
        userUpdatePayload.phoneNumber = trimmedPhone;
      }
      if (data.profileImageUrl !== undefined) {
        customerUpdatePayload.profileImageUrl = data.profileImageUrl;
        userUpdatePayload.profileImageUrl = data.profileImageUrl;
      }
      if (data.profileImagePath !== undefined) {
        customerUpdatePayload.profileImagePath = data.profileImagePath;
        userUpdatePayload.profileImagePath = data.profileImagePath;
      }

      await Promise.all([
        withTimeout(setDoc(docRef, customerUpdatePayload, { merge: true }), 10000, 'Gagal memperbarui profil pelanggan di Firestore'),
        withTimeout(setDoc(userRef, userUpdatePayload, { merge: true }), 10000, 'Gagal memperbarui data pengguna di Firestore'),
      ]);

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[Firestore updateCustomerProfile Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Gagal menyimpan data profil ke Firestore.' },
      };
    }
  },

  /**
   * Get customer notifications
   */
  async getNotifications(customerId: string): Promise<CustomerNotification[]> {
    try {
      if (!customerId) return [];
      const q = firestoreQuery(
        collection(firestore, 'notifications'),
        where('customerId', '==', customerId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as any),
        id: docSnap.id,
      })) as CustomerNotification[];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get recent searches
   */
  async getRecentSearches(customerId: string): Promise<RecentSearch[]> {
    try {
      if (!customerId) return [];
      const q = firestoreQuery(
        collection(firestore, 'recentSearches'),
        where('customerId', '==', customerId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as any),
        id: docSnap.id,
      })) as RecentSearch[];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(customerId: string): Promise<number> {
    try {
      if (!customerId) return 0;
      const q = firestoreQuery(
        collection(firestore, 'notifications'),
        where('customerId', '==', customerId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    customerId: string,
    notificationId: string
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!customerId || !notificationId) {
        return { success: false, error: { message: 'Missing parameters' } };
      }
      await updateDoc(doc(firestore, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { message: error?.message || 'Failed to mark notification as read' } };
    }
  },
};
