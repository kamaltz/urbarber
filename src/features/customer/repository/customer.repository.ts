/**
 * Firebase Customer Repository
 * Data access layer for customer profile, discovery, and preferences
 */

import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    query as firestoreQuery,
    getDoc,
    getDocs,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    MOCK_CUSTOMER_EXPLORE_DATA,
    MOCK_CUSTOMER_HOME_DATA,
} from '../mock/customers';
import type {
    CategoryChip,
    CustomerExploreData,
    CustomerFavoritesData,
    CustomerHomeData,
    CustomerLocationData,
    CustomerNotification,
    CustomerProfile,
    RecentSearch,
    UpdateProfileData,
} from '../types/customer';

function isOfflineError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'unavailable' || candidate.message?.toLowerCase().includes('client is offline') === true;
}

export const customerRepository = {
  /**
   * Get customer profile matching exact registration name from Firestore & Auth
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    const authUser = firebaseAuth.currentUser;
    const fallbackName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Customer URBarber';

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
      const snapshot = await withTimeout(getDoc(docRef), 10000, 'Customer profile fetch timed out');

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
        // Support reading legacy avatar fields for backward compatibility, but map to profileImageUrl & profileImagePath
        if (data.profileImageUrl || data.profileImage || data.avatarUrl) {
          profileImageUrl = data.profileImageUrl || data.profileImage || data.avatarUrl;
        }
        if (data.profileImagePath) profileImagePath = data.profileImagePath;
        if (data.phoneNumber || data.phone) phone = data.phoneNumber || data.phone;
        if (data.location) location = data.location;
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
    data: UpdateProfileData,
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

      // Only write canonical fields that are explicitly provided
      if (data.name !== undefined) {
        customerUpdatePayload.name = data.name;
        customerUpdatePayload.fullName = data.name;
        userUpdatePayload.name = data.name;
      }
      if (data.email !== undefined) {
        customerUpdatePayload.email = data.email;
        userUpdatePayload.email = data.email;
      }
      if (data.location !== undefined) {
        customerUpdatePayload.location = data.location;
      }
      if (data.phone !== undefined) {
        customerUpdatePayload.phone = data.phone;
        customerUpdatePayload.phoneNumber = data.phone;
        userUpdatePayload.phoneNumber = data.phone;
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
   * Get customer home data
   */
  async getCustomerHomeData(customerId: string): Promise<CustomerHomeData | null> {
    try {
      if (!customerId) return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };
      const docRef = doc(firestore, 'customerHomeData', customerId);
      const snapshot = await withTimeout(getDoc(docRef), 5000, 'Customer home data fetch timed out');

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId, ...snapshot.data() } as CustomerHomeData;
    } catch (error) {
      if (!isOfflineError(error)) console.warn('Unable to fetch home data; using fallback.', error);
      return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };
    }
  },

  /**
   * Get customer explore/discovery data
   */
  async getCustomerExploreData(customerId: string): Promise<CustomerExploreData | null> {
    try {
      if (!customerId) return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId };
      const docRef = doc(firestore, 'customerExploreData', customerId);
      const snapshot = await withTimeout(getDoc(docRef), 5000, 'Customer explore data fetch timed out');

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId, ...snapshot.data() } as CustomerExploreData;
    } catch (error) {
      if (!isOfflineError(error)) console.warn('Unable to fetch explore data; using fallback.', error);
      return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId };
    }
  },

  /**
   * Search barbers or services
   */
  async searchBarbers(
    customerId: string,
    query: string,
    filters?: { category?: string; location?: string; maxDistance?: number },
  ): Promise<CustomerExploreData | null> {
    try {
      const barbersRef = collection(firestore, 'barbers');
      let searchQueryRef: any = barbersRef;

      if (filters?.category) {
        searchQueryRef = firestoreQuery(barbersRef, where('serviceType', 'array-contains', filters.category));
      }

      const snapshot = await withTimeout(getDocs(searchQueryRef), 5000, 'Barbers search timed out');
      const barbers = snapshot.docs.map((doc) => ({
        ...(doc.data() as object),
        id: doc.id,
      }));

      // Filter by query string if provided
      const filtered = query
        ? barbers.filter(
            (barber: any) =>
              barber.name?.toLowerCase().includes(query.toLowerCase()) ||
              barber.serviceType?.some((s: string) =>
                s.toLowerCase().includes(query.toLowerCase()),
              ),
          )
        : barbers;

      return {
        searchQuery: query,
        selectedCategory: filters?.category,
        nearbyBarbers: filtered as any,
        categoryChips: [],
        featuredBarber: (filtered[0] as any) || MOCK_CUSTOMER_EXPLORE_DATA.featuredBarber,
      } as unknown as CustomerExploreData;
    } catch (error) {
      console.error('Error searching barbers:', error);
      return MOCK_CUSTOMER_EXPLORE_DATA;
    }
  },

  /**
   * Get favorite barbers
   */
  async getFavoriteBarbers(customerId: string): Promise<CustomerFavoritesData | null> {
    try {
      const q = firestoreQuery(
        collection(firestore, 'favorites'),
        where('customerId', '==', customerId),
      );

      const snapshot = await withTimeout(getDocs(q), 5000, 'Favorites fetch timed out');
      const favorites = snapshot.docs.map((doc) => (doc.data() as any).barberId);

      return {
        favoriteBarbers: favorites.map((id) => ({
          id,
          name: 'Barber',
          rating: 4.5,
          reviewCount: 50,
          distance: '1.2 km',
        })) as any,
      } as unknown as CustomerFavoritesData;
    } catch (error) {
      console.error('Error fetching favorite barbers:', error);
      return null;
    }
  },

  /**
   * Toggle favorite barber
   */
  async toggleFavoriteBarber(
    customerId: string,
    barberId: string,
  ): Promise<{ success: boolean; isFavorite: boolean; error?: { message: string } }> {
    try {
      if (!customerId || !barberId) {
        return { success: false, isFavorite: false, error: { message: 'Missing parameters' } };
      }

      const q = firestoreQuery(
        collection(firestore, 'favorites'),
        where('customerId', '==', customerId),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Add to favorites
        await addDoc(collection(firestore, 'favorites'), {
          customerId,
          barberId,
          createdAt: Timestamp.now(),
        });
        return { success: true, isFavorite: true };
      } else {
        // Remove from favorites
        await deleteDoc(doc(firestore, 'favorites', snapshot.docs[0].id));
        return { success: true, isFavorite: false };
      }
    } catch (error) {
      return {
        success: false,
        isFavorite: false,
        error: { message: 'Failed to toggle favorite' },
      };
    }
  },

  /**
   * Get location search results
   */
  async searchLocations(query: string): Promise<CustomerLocationData> {
    try {
      const locationsRef = collection(firestore, 'locations');
      const snapshot = await getDocs(locationsRef);
      const allLocations = snapshot.docs.map((doc) => doc.data());

      const filtered = allLocations.filter(
        (loc: any) =>
          loc.locationName.toLowerCase().includes(query.toLowerCase()) ||
          loc.locationAddress.toLowerCase().includes(query.toLowerCase()),
      );

      return {
        recentSearches: [],
        suggestedLocations: filtered as any,
      };
    } catch (error) {
      console.error('Error searching locations:', error);
      return {
        recentSearches: [],
        suggestedLocations: [],
      };
    }
  },

  /**
   * Get customer notifications
   */
  async getNotifications(customerId: string): Promise<CustomerNotification[]> {
    try {
      const q = firestoreQuery(
        collection(firestore, 'notifications'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...(doc.data() as any),
        id: doc.id,
      })) as CustomerNotification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    customerId: string,
    notificationId: string,
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to mark notification as read' },
      };
    }
  },

  /**
   * Get recent searches
   */
  async getRecentSearches(customerId: string): Promise<RecentSearch[]> {
    try {
      const q = firestoreQuery(
        collection(firestore, 'recentSearches'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...(doc.data() as any),
        id: doc.id,
      })) as RecentSearch[];
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      return [];
    }
  },

  /**
   * Add to recent searches
   */
  async addRecentSearch(
    customerId: string,
    query: string,
    type: 'barber' | 'location' | 'service',
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!customerId || !query) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await addDoc(collection(firestore, 'recentSearches'), {
        customerId,
        query,
        type,
        createdAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to add recent search' },
      };
    }
  },

  /**
   * Clear recent searches
   */
  async clearRecentSearches(customerId: string): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!customerId) {
        return { success: false, error: { message: 'Missing customer ID' } };
      }

      const q = firestoreQuery(
        collection(firestore, 'recentSearches'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      for (const docItem of snapshot.docs) {
        await deleteDoc(docItem.ref);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to clear recent searches' },
      };
    }
  },

  /**
   * Update category filter
   */
  async updateCategoryFilter(
    customerId: string,
    categoryId: string,
  ): Promise<{ success: boolean; categories?: CategoryChip[]; error?: { message: string } }> {
    try {
      if (!customerId || !categoryId) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'customers', customerId), {
        selectedCategories: categoryId,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update category filter' },
      };
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(customerId: string): Promise<number> {
    try {
      const q = firestoreQuery(
        collection(firestore, 'notifications'),
        where('customerId', '==', customerId),
        where('read', '==', false),
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
  },
};
