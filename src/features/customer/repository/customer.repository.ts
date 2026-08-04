/**
 * Firebase Customer Repository
 * Data access layer for customer profile, discovery, and preferences
 */

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
    MOCK_CUSTOMER_EXPLORE_DATA,
    MOCK_CUSTOMER_HOME_DATA,
    MOCK_CUSTOMER_PROFILE,
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
   * Get customer profile
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    try {
      const docRef = doc(firestore, 'customers', customerId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_PROFILE, userId: customerId };

      return { ...MOCK_CUSTOMER_PROFILE, ...snapshot.data(), userId: customerId } as CustomerProfile;
    } catch (error) {
      if (isOfflineError(error)) return { ...MOCK_CUSTOMER_PROFILE, userId: customerId };
      console.warn('Unable to fetch customer profile; using local data.', error);
      return { ...MOCK_CUSTOMER_PROFILE, userId: customerId };
    }
  },

  /**
   * Update customer profile
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

      await updateDoc(doc(firestore, 'customers', customerId), {
        ...data,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update profile' },
      };
    }
  },

  /**
   * Get customer home data
   */
  async getCustomerHomeData(customerId: string): Promise<CustomerHomeData | null> {
    try {
      const docRef = doc(firestore, 'customerHomeData', customerId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_HOME_DATA, ...snapshot.data(), userId: customerId } as CustomerHomeData;
    } catch (error) {
      if (!isOfflineError(error)) console.warn('Unable to fetch home data; using local data.', error);
      return { ...MOCK_CUSTOMER_HOME_DATA, userId: customerId };
    }
  },

  /**
   * Get customer explore/discovery data
   */
  async getCustomerExploreData(customerId: string): Promise<CustomerExploreData | null> {
    try {
      const docRef = doc(firestore, 'customerExploreData', customerId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return { ...MOCK_CUSTOMER_EXPLORE_DATA, userId: customerId };

      return { ...MOCK_CUSTOMER_EXPLORE_DATA, ...snapshot.data(), userId: customerId } as CustomerExploreData;
    } catch (error) {
      if (!isOfflineError(error)) console.warn('Unable to fetch explore data; using local data.', error);
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
      let q = barbersRef;

      if (filters?.category) {
        q = query(barbersRef, where('serviceType', 'array-contains', filters.category));
      }

      const snapshot = await getDocs(q);
      const barbers = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Filter by query string if provided
      const filtered = query
        ? barbers.filter(
            (barber: any) =>
              barber.name.toLowerCase().includes(query.toLowerCase()) ||
              barber.serviceType.some((s: string) =>
                s.toLowerCase().includes(query.toLowerCase()),
              ),
          )
        : barbers;

      return {
        searchQuery: query,
        selectedCategory: filters?.category,
        nearbyBarbers: filtered as any,
        categoryChips: [],
        featuredBarbers: filtered.slice(0, 3) as any,
      };
    } catch (error) {
      console.error('Error searching barbers:', error);
      return null;
    }
  },

  /**
   * Get favorite barbers
   */
  async getFavoriteBarbers(customerId: string): Promise<CustomerFavoritesData | null> {
    try {
      const q = query(
        collection(firestore, 'favorites'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      const favorites = snapshot.docs.map((doc) => doc.data().barberId);

      return {
        favorites: favorites.map((id) => ({
          id,
          name: 'Barber',
          rating: 4.5,
          reviewCount: 50,
        })) as any,
      };
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

      const q = query(
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
      const q = query(
        collection(firestore, 'notifications'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
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
      const q = query(
        collection(firestore, 'recentSearches'),
        where('customerId', '==', customerId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
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

      const q = query(
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
      const q = query(
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
