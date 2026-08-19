/**
 * Customer Feature Types
 * Defines interfaces for customer profile, discovery, and preferences
 */

export interface CustomerProfile {
  userId: string;
  name: string;
  email: string;
  location: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeaturedService {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  description?: string;
}

export interface BarberSuggestion {
  barberId: string;
  name: string;
  status: string;
  rating?: number;
  distance?: string;
  imageUrl?: string;
  location?: string;
}

export interface FeaturedBarber {
  barberId: string;
  name: string;
  imageUrl?: string;
  location: string;
  distance: string;
  rating: number;
  isFavorite: boolean;
  serviceTags: string[];
  reviewCount?: number;
}

export interface NearbyBarber {
  barberId: string;
  name: string;
  imageUrl?: string;
  serviceType: string;
  location: string;
  distance: string;
  rating: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * 'granted': using the Customer's real current position.
 * 'default_area': foreground location wasn't available/granted, so results are
 *   centered on a fixed default area -- must be shown to the Customer as such,
 *   never presented as their live location.
 */
export type DiscoveryLocationMode = 'granted' | 'default_area';

/**
 * 'ok' / 'zero_results': the discovery query ran successfully (zero results is a
 *   legitimate outcome, not an error).
 * 'query_failed': the query infrastructure failed (e.g. missing Firestore index) --
 *   must be shown as a degraded state, never silently presented as "no barbers".
 */
export type DiscoveryQueryOutcome = 'ok' | 'zero_results' | 'query_failed';

export interface PublicBarberSummary {
  id: string;
  userId: string;
  displayName: string;
  description: string;
  address: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  ratingAverage: number;
  reviewCount: number;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  status: 'active' | 'suspended';
  serviceTypes?: string[];
  createdAt?: string;
}

export interface CategoryChip {
  id: string;
  label: string;
  isActive: boolean;
  order?: number;
  /** Mirrors backend/vercel/src/admin/admin.types.ts CategoryRecommendationRule.
   * Defaults to 'default' for categories created before this field existed. */
  recommendationRule?: import('@/features/location/services/recommendation-rules').CategoryRecommendationRule;
}

export interface CustomerSettings {
  notificationsEnabled: boolean;
  theme?: 'light' | 'dark';
  language?: string;
  preferences?: Record<string, boolean | string>;
}

export interface CustomerHomeData {
  userId: string;
  userName: string;
  profileImageUrl?: string;
  featuredServices: FeaturedService[];
  barberSuggestions: BarberSuggestion[];
  notificationCount: number;
  activeBooking?: {
    id: string;
    serviceName?: string;
    barberName?: string;
    bookingDate?: string;
    bookingTime?: string;
    status?: string;
  } | null;
}

export interface CustomerExploreData {
  userId: string;
  searchQuery?: string;
  selectedCategory?: string;
  featuredBarber: FeaturedBarber;
  nearbyBarbers: NearbyBarber[];
  categoryChips: CategoryChip[];
  sliderPosition: number;
  locationMode: DiscoveryLocationMode;
  queryOutcome: DiscoveryQueryOutcome;
  searchCenter: { latitude: number; longitude: number };
}

export interface CustomerFavoritesData {
  userId: string;
  searchQuery?: string;
  selectedCategory?: string;
  favoriteBarbers: BarberSuggestion[];
  categoryChips: CategoryChip[];
}

export interface Location {
  locationId: string;
  locationName: string;
  locationAddress: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
}

export interface CustomerLocationData {
  selectedLocationId?: string;
  recentSearches: Location[];
  suggestedLocations: Location[];
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  location?: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  phone?: string;
}

export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'chat' | 'promo' | 'update';
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  type: 'barber' | 'location' | 'service';
  timestamp: string;
}
