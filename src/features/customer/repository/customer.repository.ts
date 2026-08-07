/**
 * Firebase Customer Repository
 * Data access layer for customer profile, discovery, categories, and favorites
 */

import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import {
  collection,
  deleteDoc,
  doc,
  query as firestoreQuery,
  getDoc,
  getDocs,
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
  PublicBarberSummary,
  RecentSearch,
  UpdateProfileData,
} from '../types/customer';

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
        where('status', '==', 'active'),
        where('verified', '==', true)
      );

      if (filters?.categoryId) {
        q = firestoreQuery(
          barbersRef,
          where('status', '==', 'active'),
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
      const [barbers, categories] = await Promise.all([
        this.getPublicBarbers(),
        this.getCategories(),
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

      return {
        userId: customerId,
        userName,
        profileImageUrl: authUser?.photoURL || undefined,
        featuredServices,
        barberSuggestions,
        notificationCount: 0,
      };
    } catch (error: any) {
      if (__DEV__ && !isOfflineError(error)) {
        console.warn('[CustomerRepository getCustomerHomeData Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Search barbers with debounced text matching & category filter
   */
  async searchBarbers(
    customerId: string,
    query: string,
    filters?: { category?: string; location?: string }
  ): Promise<CustomerExploreData | null> {
    try {
      const barbers = await this.getPublicBarbers({ categoryId: filters?.category });
      const categories = await this.getCategories();

      const normalizedQuery = normalizeSearchKeyword(query);

      const filteredBarbers = normalizedQuery
        ? barbers.filter((barber) => {
            const nameMatch = normalizeSearchKeyword(barber.displayName).includes(normalizedQuery);
            const addressMatch = normalizeSearchKeyword(barber.address).includes(normalizedQuery);
            const descMatch = normalizeSearchKeyword(barber.description).includes(normalizedQuery);
            const typeMatch = barber.serviceTypes?.some((st) =>
              normalizeSearchKeyword(st).includes(normalizedQuery)
            );
            return nameMatch || addressMatch || descMatch || typeMatch;
          })
        : barbers;

      const categoryChips: CategoryChip[] = categories.map((cat) => ({
        ...cat,
        isActive: cat.id === filters?.category,
      }));

      const nearbyBarbers = filteredBarbers.map((b) => ({
        barberId: b.id,
        name: b.displayName,
        imageUrl: b.profileImageUrl,
        serviceType: b.serviceTypes && b.serviceTypes.length > 0 ? b.serviceTypes.join(', ') : 'Grooming',
        location: b.address || 'Garut',
        distance: 'Garut',
        rating: b.ratingAverage,
        reviewCount: b.reviewCount,
      }));

      const featured = filteredBarbers[0]
        ? {
            barberId: filteredBarbers[0].id,
            name: filteredBarbers[0].displayName,
            imageUrl: filteredBarbers[0].profileImageUrl,
            location: filteredBarbers[0].address || 'Garut',
            distance: 'Garut',
            rating: filteredBarbers[0].ratingAverage,
            isFavorite: false,
            serviceTags: filteredBarbers[0].serviceTypes || [],
            reviewCount: filteredBarbers[0].reviewCount,
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

      return {
        userId: customerId,
        searchQuery: query,
        selectedCategory: filters?.category,
        featuredBarber: featured,
        nearbyBarbers,
        categoryChips,
        sliderPosition: 0,
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
