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
}

export interface CategoryChip {
  id: string;
  label: string;
  isActive: boolean;
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
}

export interface CustomerExploreData {
  userId: string;
  searchQuery?: string;
  selectedCategory?: string;
  featuredBarber: FeaturedBarber;
  nearbyBarbers: NearbyBarber[];
  categoryChips: CategoryChip[];
  sliderPosition: number;
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
