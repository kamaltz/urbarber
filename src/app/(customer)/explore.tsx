import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { Rating } from '@/components/ui/Rating';
import { MAP_CONFIG } from '@/config/map.config';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useFavorites } from '@/features/customer/context/favorites-context';
import { useCustomerSearch } from '@/features/customer/hooks/use-customer-search';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ExploreScreen() {
  const { user } = useAuth();
  const customerId = user?.uid || '';
  const { isFavorite, toggleFavorite } = useFavorites();

  const params = useLocalSearchParams<{ category?: string }>();
  const initialCategory = params.category;

  const {
    exploreData,
    loading,
    error,
    searchQuery,
    selectedCategory,
    locationUiStatus,
    requestLocation,
    onSearchQueryChange,
    onCategorySelect,
    clearSearch,
    refresh,
  } = useCustomerSearch(customerId, initialCategory);

  const [selectedBarberId, setSelectedBarberId] = useState<string | undefined>();

  const handleBarberPress = useCallback((barberId: string) => {
    setSelectedBarberId(barberId);
    router.push({
      pathname: '/(customer)/barber/[barberId]',
      params: { barberId },
    });
  }, []);

  const barberMarkers = useMemo(
    () =>
      (exploreData?.nearbyBarbers || []).filter(
        (b) => typeof b.latitude === 'number' && typeof b.longitude === 'number'
      ),
    [exploreData?.nearbyBarbers]
  );

  const center = exploreData?.searchCenter || {
    latitude: MAP_CONFIG.defaultViewport.latitude,
    longitude: MAP_CONFIG.defaultViewport.longitude,
  };
  // Only remount the camera (and reset its viewport) when coordinates actually
  // change -- exploreData.searchCenter is a fresh object on every fetch, so keying
  // on its identity would re-jump the map on every keystroke.
  const cameraKey = `${center.latitude.toFixed(4)},${center.longitude.toFixed(4)}`;
  const showCustomerMarker = exploreData?.locationMode === 'granted';
  const showDefaultAreaNotice = exploreData?.locationMode === 'default_area' && locationUiStatus !== 'requesting';

  return (
    <CustomerScreen
      title="Cari Barber"
      description="Temukan barber terpercaya dan terverifikasi di sekitar Anda."
      showTabs
    >
      {/* Default-area notice: never let this look like the Customer's real location */}
      {showDefaultAreaNotice ? (
        <View className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <Text className="text-xs font-semibold text-amber-900">
            Menampilkan barber di sekitar area default (Garut), bukan lokasi Anda saat ini.
          </Text>
          <AppButton
            label="Gunakan Lokasi Saya"
            onPress={requestLocation}
            variant="secondary"
            fullWidth={false}
            className="mt-2 self-start"
          />
        </View>
      ) : null}

      {/* Map */}
      <View className="mb-4 h-64 overflow-hidden rounded-2xl border border-slate-200">
        <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }}>
          <Camera
            key={cameraKey}
            initialViewState={{
              center: [center.longitude, center.latitude],
              zoom: MAP_CONFIG.defaultViewport.zoom,
            }}
          />

          {showCustomerMarker ? (
            <Marker lngLat={[center.longitude, center.latitude]} id="customer-location">
              <View className="h-4 w-4 rounded-full border-2 border-white bg-blue-600" />
            </Marker>
          ) : null}

          {barberMarkers.map((barber) => (
            <Marker
              key={barber.barberId}
              lngLat={[barber.longitude as number, barber.latitude as number]}
              id={`barber-${barber.barberId}`}
              onPress={() => handleBarberPress(barber.barberId)}
            >
              <View
                className={`h-5 w-5 rounded-full border-2 border-white ${
                  selectedBarberId === barber.barberId ? 'bg-[#D2691E]' : 'bg-slate-900'
                }`}
              />
            </Marker>
          ))}
        </Map>
      </View>

      {/* Search Input Box */}
      <View className="mb-4">
        <View className="flex-row items-center rounded-xl bg-white px-3.5 py-2.5 border border-slate-200 shadow-sm">
          <Text className="mr-2 text-slate-400">🔍</Text>
          <TextInput
            className="flex-1 text-sm font-medium text-slate-900"
            placeholder="Cari nama barber, layanan, atau lokasi..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            autoCorrect={false}
          />
          {searchQuery ? (
            <Pressable onPress={clearSearch} className="p-1">
              <Text className="text-xs text-slate-400 font-bold">✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Filter Chips */}
      {exploreData?.categoryChips && exploreData.categoryChips.length > 0 ? (
        <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            <Pressable
              onPress={() => onCategorySelect(undefined)}
              className={`rounded-full px-4 py-2 border ${
                !selectedCategory
                  ? 'bg-[#D2691E] border-[#D2691E]'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  !selectedCategory ? 'text-white' : 'text-slate-700'
                }`}
              >
                Semua
              </Text>
            </Pressable>
            {exploreData.categoryChips.map((chip, idx) => {
              const active = selectedCategory === chip.id;
              return (
                <Pressable
                  key={chip.id || `chip-${idx}`}
                  onPress={() => onCategorySelect(chip.id)}
                  className={`rounded-full px-4 py-2 border ${
                    active
                      ? 'bg-[#D2691E] border-[#D2691E]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Main Results View */}
      {loading ? (
        <View className="py-12 items-center">
          <Loading />
        </View>
      ) : error ? (
        <View className="p-4 rounded-xl bg-red-50 border border-red-200 my-4">
          <Text className="text-sm font-semibold text-red-800 text-center mb-1">
            Gagal Memuat Hasil Pencarian
          </Text>
          <Text className="text-xs text-red-600 text-center mb-3">{error}</Text>
          <AppButton label="Coba Lagi" onPress={refresh} variant="secondary" />
        </View>
      ) : exploreData?.queryOutcome === 'query_failed' ? (
        <EmptyState
          title="Gagal Memuat Data Barber"
          description="Terjadi gangguan saat mengambil data. Silakan coba lagi."
          actionLabel="Coba Lagi"
          onActionPress={refresh}
        />
      ) : exploreData?.nearbyBarbers && exploreData.nearbyBarbers.length > 0 ? (
        <View className="gap-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Ditemukan ({exploreData.nearbyBarbers.length}) Barber
          </Text>
          {exploreData.nearbyBarbers.map((barber, idx) => (
            <AppCard
              key={barber.barberId || `explore-barber-${idx}`}
              onPress={() => handleBarberPress(barber.barberId)}
              className={`p-4 ${selectedBarberId === barber.barberId ? 'border-[#D2691E]' : ''}`}
            >
              <View className="flex-row items-center gap-3">
                <Avatar
                  size="md"
                  name={barber.name}
                  source={barber.imageUrl ? { uri: barber.imageUrl } : undefined}
                />
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-slate-900">{barber.name}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="rounded-full bg-amber-50 px-2 py-0.5 border border-amber-200">
                        <Text className="text-[10px] font-bold text-amber-800">Verified</Text>
                      </View>
                      <Pressable
                        onPress={() => toggleFavorite(barber.barberId)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Tambah atau hapus favorit"
                      >
                        <Text className="text-base">
                          {isFavorite(barber.barberId) ? '❤️' : '🤍'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text className="mt-1 text-xs text-slate-600" numberOfLines={1}>
                    📍 {barber.location}
                  </Text>
                  <Text className="mt-1 text-xs text-[#D2691E] font-medium" numberOfLines={1}>
                    ✂️ {barber.serviceType}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <Rating value={barber.rating} size="sm" />
                    <Text className="text-xs font-semibold text-slate-700">
                      {barber.rating.toFixed(1)}
                    </Text>
                    {barber.reviewCount ? (
                      <Text className="text-xs text-slate-500">({barber.reviewCount} ulasan)</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Tidak Ada Barber Ditemukan"
          description={
            searchQuery || selectedCategory
              ? 'Coba ubah kata kunci pencarian atau pilih kategori lain.'
              : 'Belum ada Barber aktif di sekitar area ini.'
          }
          actionLabel={searchQuery || selectedCategory ? 'Bersihkan Filter' : 'Muat Ulang'}
          onActionPress={searchQuery || selectedCategory ? clearSearch : refresh}
        />
      )}
    </CustomerScreen>
  );
}
