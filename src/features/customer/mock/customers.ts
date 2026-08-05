/**
 * Mock Customer Data
 * Provides sample data for customer feature development
 */

import type {
    BarberSuggestion,
    CategoryChip,
    CustomerExploreData,
    CustomerFavoritesData,
    CustomerHomeData,
    CustomerNotification,
    CustomerProfile,
    FeaturedBarber,
    FeaturedService,
    Location,
    NearbyBarber,
    RecentSearch,
} from '../types/customer';

export const MOCK_CUSTOMER_ID = 'CUST001';

export const MOCK_CUSTOMER_PROFILE: CustomerProfile = {
  userId: MOCK_CUSTOMER_ID,
  name: 'Customer URBarber',
  email: 'customer@email.com',
  location: 'Jakarta Selatan',
  profileImageUrl: undefined,
  phone: '+62812-3456-7890',
  createdAt: '2024-01-15T08:00:00Z',
  updatedAt: '2024-08-04T10:30:00Z',
};

export const MOCK_FEATURED_SERVICES: FeaturedService[] = [
  {
    id: 'SVC001',
    title: 'Haircut Premium',
    subtitle: 'Potongan rambut gaya terkini',
    imageUrl:
      'https://images.unsplash.com/photo-1599351751234-97856d9e1a4b?w=400&h=300&fit=crop',
    description: 'Potongan rambut profesional dengan teknik modern',
  },
  {
    id: 'SVC002',
    title: 'Beard Grooming',
    subtitle: 'Perawatan jenggot lengkap',
    imageUrl:
      'https://images.unsplash.com/photo-1585747860715-cd4628902d4a?w=400&h=300&fit=crop',
    description: 'Grooming jenggot dengan produk premium',
  },
  {
    id: 'SVC003',
    title: 'Hair Coloring',
    subtitle: 'Pewarnaan rambut profesional',
    imageUrl:
      'https://images.unsplash.com/photo-1562322140-8baeae34c886?w=400&h=300&fit=crop',
    description: 'Pewarnaan dengan bahan berkualitas tinggi',
  },
];

export const MOCK_BARBER_SUGGESTIONS: BarberSuggestion[] = [
  {
    barberId: 'BARB001',
    name: 'Toni Barbershop',
    status: 'Buka',
    rating: 4.8,
    distance: '2.5 km',
    imageUrl:
      'https://images.unsplash.com/photo-1536828291940-19d0a72ff43c?w=200&h=200&fit=crop',
    location: 'Kuningan, Jakarta Selatan',
  },
  {
    barberId: 'BARB002',
    name: 'Barber Studios',
    status: 'Buka',
    rating: 4.6,
    distance: '3.2 km',
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop',
    location: 'Menteng, Jakarta Pusat',
  },
  {
    barberId: 'BARB003',
    name: 'Modern Cuts',
    status: 'Buka',
    rating: 4.5,
    distance: '4.1 km',
    imageUrl:
      'https://images.unsplash.com/photo-1503235930437-8c6829f432c0?w=200&h=200&fit=crop',
    location: 'Kebayoran Baru, Jakarta Selatan',
  },
];

export const MOCK_FEATURED_BARBER: FeaturedBarber = {
  barberId: 'BARB001',
  name: 'Toni Barbershop Premium',
  imageUrl:
    'https://images.unsplash.com/photo-1536828291940-19d0a72ff43c?w=600&h=400&fit=crop',
  location: 'Kuningan, Jakarta Selatan',
  distance: '2.5 km',
  rating: 4.8,
  isFavorite: false,
  serviceTags: ['Haircut', 'Beard', 'Coloring'],
  reviewCount: 342,
};

export const MOCK_NEARBY_BARBERS: NearbyBarber[] = [
  {
    barberId: 'BARB001',
    name: 'Toni Barbershop',
    imageUrl:
      'https://images.unsplash.com/photo-1536828291940-19d0a72ff43c?w=150&h=150&fit=crop',
    serviceType: 'Premium Haircut',
    location: 'Kuningan, Jakarta Selatan',
    distance: '2.5 km',
    rating: 4.8,
    reviewCount: 342,
  },
  {
    barberId: 'BARB002',
    name: 'Barber Studios',
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=150&h=150&fit=crop',
    serviceType: 'Classic Grooming',
    location: 'Menteng, Jakarta Pusat',
    distance: '3.2 km',
    rating: 4.6,
    reviewCount: 218,
  },
  {
    barberId: 'BARB003',
    name: 'Modern Cuts',
    imageUrl:
      'https://images.unsplash.com/photo-1503235930437-8c6829f432c0?w=150&h=150&fit=crop',
    serviceType: 'Urban Style',
    location: 'Kebayoran Baru, Jakarta Selatan',
    distance: '4.1 km',
    rating: 4.5,
    reviewCount: 156,
  },
  {
    barberId: 'BARB004',
    name: 'Gentlemen\'s Corner',
    imageUrl:
      'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=150&h=150&fit=crop',
    serviceType: 'Classic Barbershop',
    location: 'Pondok Indah, Jakarta Selatan',
    distance: '5.3 km',
    rating: 4.7,
    reviewCount: 289,
  },
];

export const MOCK_CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'CAT001', label: 'Haircut', isActive: true },
  { id: 'CAT002', label: 'Beard', isActive: false },
  { id: 'CAT003', label: 'Coloring', isActive: false },
  { id: 'CAT004', label: 'Kids', isActive: false },
  { id: 'CAT005', label: 'Massage', isActive: false },
];

export const MOCK_CUSTOMER_HOME_DATA: CustomerHomeData = {
  userId: MOCK_CUSTOMER_ID,
  userName: MOCK_CUSTOMER_PROFILE.name,
  profileImageUrl: MOCK_CUSTOMER_PROFILE.profileImageUrl,
  featuredServices: MOCK_FEATURED_SERVICES,
  barberSuggestions: MOCK_BARBER_SUGGESTIONS,
  notificationCount: 3,
};

export const MOCK_CUSTOMER_EXPLORE_DATA: CustomerExploreData = {
  userId: MOCK_CUSTOMER_ID,
  searchQuery: '',
  selectedCategory: 'Haircut',
  featuredBarber: MOCK_FEATURED_BARBER,
  nearbyBarbers: MOCK_NEARBY_BARBERS,
  categoryChips: MOCK_CATEGORY_CHIPS,
  sliderPosition: 0,
};

export const MOCK_FAVORITE_BARBERS: BarberSuggestion[] = [
  {
    barberId: 'BARB001',
    name: 'Toni Barbershop',
    status: 'Buka',
    rating: 4.8,
    distance: '2.5 km',
    imageUrl:
      'https://images.unsplash.com/photo-1536828291940-19d0a72ff43c?w=200&h=200&fit=crop',
    location: 'Kuningan, Jakarta Selatan',
  },
  {
    barberId: 'BARB002',
    name: 'Barber Studios',
    status: 'Buka',
    rating: 4.6,
    distance: '3.2 km',
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop',
    location: 'Menteng, Jakarta Pusat',
  },
];

export const MOCK_CUSTOMER_FAVORITES_DATA: CustomerFavoritesData = {
  userId: MOCK_CUSTOMER_ID,
  searchQuery: '',
  selectedCategory: 'Haircut',
  favoriteBarbers: MOCK_FAVORITE_BARBERS,
  categoryChips: MOCK_CATEGORY_CHIPS,
};

export const MOCK_LOCATIONS: Location[] = [
  {
    locationId: 'LOC001',
    locationName: 'Kuningan, Jakarta Selatan',
    locationAddress: 'Jl. H. R. Rasuna Said, Jakarta Selatan 12950',
    latitude: -6.2163,
    longitude: 106.8215,
    distance: '2.5 km',
  },
  {
    locationId: 'LOC002',
    locationName: 'Menteng, Jakarta Pusat',
    locationAddress: 'Jl. Cipto Mangunkusumo, Jakarta Pusat 10160',
    latitude: -6.1959,
    longitude: 106.8123,
    distance: '3.2 km',
  },
  {
    locationId: 'LOC003',
    locationName: 'Kebayoran Baru, Jakarta Selatan',
    locationAddress: 'Jl. Tebet Barat Raya, Jakarta Selatan 12810',
    latitude: -6.2453,
    longitude: 106.8224,
    distance: '4.1 km',
  },
];

export const MOCK_RECENT_SEARCHES: RecentSearch[] = [
  {
    id: 'RS001',
    query: 'Barbershop dekat Kuningan',
    type: 'barber',
    timestamp: '2024-08-03T18:30:00Z',
  },
  {
    id: 'RS002',
    query: 'Premium haircut Jakarta',
    type: 'service',
    timestamp: '2024-08-02T14:15:00Z',
  },
  {
    id: 'RS003',
    query: 'Menteng',
    type: 'location',
    timestamp: '2024-08-01T10:45:00Z',
  },
];

export const MOCK_NOTIFICATIONS: CustomerNotification[] = [
  {
    id: 'NOTIF001',
    title: 'Jadwal Potong Rambut',
    message: 'Pengingat: Jadwal Anda di Toni Barbershop hari ini pukul 14:00',
    type: 'booking',
    read: false,
    createdAt: '2024-08-04T07:30:00Z',
    relatedId: 'BOOK001',
  },
  {
    id: 'NOTIF002',
    title: 'Pesan Baru dari Toni Barbershop',
    message: 'Master Toni: Siap membantu Anda hari ini',
    type: 'chat',
    read: false,
    createdAt: '2024-08-03T16:45:00Z',
    relatedId: 'CHAT001',
  },
  {
    id: 'NOTIF003',
    title: 'Promo Spesial Bulan Ini',
    message: 'Diskon 20% untuk member baru setiap hari Selasa',
    type: 'promo',
    read: true,
    createdAt: '2024-08-02T09:00:00Z',
  },
];
