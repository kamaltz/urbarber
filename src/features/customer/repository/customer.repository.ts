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

export const customerRepository = {
  /**
   * Get customer profile from Firestore (reads customers/{customerId} and users/{customerId} in parallel)
   * Ensures profile image URL persists across relogging under any schema field name
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    if (!customerId) {
      return null;
    }

    const currentUser = firebaseAuth.currentUser;
    const defaultProfile: CustomerProfile = {
      userId: customerId,
      name: currentUser?.displayName || 'Pelanggan URBarber',
      email: currentUser?.email || '',
      location: '',
    };

    try {
      const customerDocRef = doc(firestore, 'customers', customerId);
      const userDocRef = doc(firestore, 'users', customerId);

      const [customerSnap, userSnap] = await Promise.allSettled([
        withTimeout(getDoc(customerDocRef), 4000, 'Customer profile fetch timed out'),
        withTimeout(getDoc(userDocRef), 4000, 'User profile fetch timed out'),
      ]);

      const customerData = customerSnap.status === 'fulfilled' && customerSnap.value.exists() ? customerSnap.value.data() : {};
      const userData = userSnap.status === 'fulfilled' && userSnap.value.exists() ? userSnap.value.data() : {};

      const combined = { ...userData, ...customerData };

      const imageUrl = combined.profileImageUrl || combined.profileImage || combined.avatarUrl || undefined;
      const imagePath = combined.profileImagePath || undefined;
      const name = combined.name || combined.fullName || combined.displayName || currentUser?.displayName || 'Pelanggan URBarber';

      return {
        ...defaultProfile,
        ...combined,
        name,
        profileImageUrl: imageUrl,
        profileImagePath: imagePath,
      } as CustomerProfile;
    } catch (error) {
      console.warn('Firestore customer profile fetch timed out or offline; using auth fallback:', error);
      return defaultProfile;
    }
  },

  /**
   * Update customer profile using setDoc with merge across customers/{uid} and users/{uid}
   */
  async updateCustomerProfile(
    customerId: string,
    data: UpdateProfileData,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!customerId) {
        return { success: false, error: { message: 'Customer ID required' } };
      }

      if (!data || Object.keys(data).length === 0) {
        return { success: false, error: { message: 'No data to update' } };
      }

      const customerDocRef = doc(firestore, 'customers', customerId);
      const userDocRef = doc(firestore, 'users', customerId);

      const imageUrl = data.profileImageUrl;
      const imagePath = data.profileImagePath;

      const payload = {
        userId: customerId,
        ...data,
        ...(imageUrl ? { profileImageUrl: imageUrl, profileImage: imageUrl, avatarUrl: imageUrl } : {}),
        ...(imagePath ? { profileImagePath: imagePath } : {}),
        updatedAt: Timestamp.now(),
      };

      await Promise.allSettled([
        withTimeout(setDoc(customerDocRef, payload, { merge: true }), 5000, 'Firestore customer profile write timed out'),
        withTimeout(setDoc(userDocRef, payload, { merge: true }), 5000, 'Firestore user write timed out'),
      ]);

      return { success: true };
    } catch (error) {
      console.warn('Failed to update customer profile in Firestore:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return {
        success: false,
        error: { message },
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
      const snapshot = await withTimeout(getDoc(docRef), 4000, 'Customer home data fetch timed out');

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId, ...snapshot.data() } as CustomerHomeData;
    } catch (error) {
      console.warn('Unable to fetch home data from Firestore:', error);
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
      const snapshot = await withTimeout(getDoc(docRef), 4000, 'Customer explore data fetch timed out');

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId, ...snapshot.data() } as CustomerExploreData;
    } catch (error) {
      console.warn('Unable to fetch explore data from Firestore:', error);
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

      const snapshot = await withTimeout(getDocs(searchQueryRef), 4000, 'Barbers search timed out');
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
      console.warn('Error searching barbers:', error);
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

      const snapshot = await withTimeout(getDocs(q), 4000, 'Favorites fetch timed out');
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
      console.warn('Error fetching favorite barbers:', error);
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
      console.warn('Error searching locations:', error);
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
      console.warn('Error fetching notifications:', error);
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
      console.warn('Error fetching recent searches:', error);
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
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
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
      console.warn('Error fetching unread notification count:', error);
      return 0;
    }
  },
};
