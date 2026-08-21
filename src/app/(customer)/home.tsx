import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { MAP_CONFIG } from '@/config/map.config';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { HomeFilterSheet, type HomeFilterValues } from '@/features/customer/components/HomeFilterSheet';
import { HomeHeroBanner } from '@/features/customer/components/HomeHeroBanner';
import { HomeSearchBar } from '@/features/customer/components/HomeSearchBar';
import { HomeSection } from '@/features/customer/components/HomeSection';
import { useCustomerHome } from '@/features/customer/hooks/use-customer-home';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { resolveCustomerAvatarUrl, resolveCustomerDisplayName } from '@/features/customer/utils/profile-display';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function HomeScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const customerId = user?.uid || '';

  const { profile } = useCustomerProfile(customerId);
  const {
    homeData,
    loading: homeLoading,
    refreshing,
    error: homeError,
    locationUiStatus,
    requestLocation,
    refresh,
  } = useCustomerHome(customerId);

  const [filterVisible, setFilterVisible] = useState(false);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handlePressBarber = useCallback((barberId: string) => {
    router.push({ pathname: '/(customer)/barber/[barberId]', params: { barberId } });
  }, []);

  const handleApplyFilter = useCallback((values: HomeFilterValues) => {
    router.push({
      pathname: routes.customer.explore,
      params: {
        ...(values.category ? { category: values.category } : {}),
        ...(values.serviceType ? { serviceType: values.serviceType } : {}),
        ...(values.sort ? { sort: values.sort } : {}),
      },
    });
  }, []);

  const nearestBarbers = useMemo(
    () => (locationUiStatus === 'granted' ? homeData?.nearestBarbers || [] : []),
    [homeData?.nearestBarbers, locationUiStatus]
  );

  const mapMarkers = useMemo(
    () => nearestBarbers.filter((b) => typeof b.latitude === 'number' && typeof b.longitude === 'number').slice(0, 8),
    [nearestBarbers]
  );

  const mapCenter = useMemo(() => {
    const first = mapMarkers[0];
    return first
      ? { latitude: first.latitude as number, longitude: first.longitude as number }
      : { latitude: MAP_CONFIG.defaultViewport.latitude, longitude: MAP_CONFIG.defaultViewport.longitude };
  }, [mapMarkers]);

  if (authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated || !customerId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-[#D2691E] mb-4">Selamat datang di URBarber</Text>
          <Text className="text-center text-slate-600 mb-6">
            Silakan masuk untuk melanjutkan layanan pemesanan barber.
          </Text>
          <AppButton
            label="Ke Halaman Login"
            onPress={() => router.replace(routes.auth.login)}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = resolveCustomerDisplayName(profile, user, 'Pelanggan');
  const avatarUrl = resolveCustomerAvatarUrl(profile, user);
  const locationLabel = profile?.location?.trim();

  const backendUnavailable = !homeLoading && !refreshing && !!homeError;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        removeClippedSubviews={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#D2691E']} />}
      >
        {/* Header: location + greeting + avatar */}
        <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
          <Pressable
            onPress={locationLabel ? undefined : requestLocation}
            className="flex-1 flex-row items-center gap-1 pr-3"
          >
            <Text className="text-xs text-slate-400">📍</Text>
            <Text className="text-xs font-semibold text-slate-500 flex-1" numberOfLines={1}>
              {locationLabel || (locationUiStatus === 'requesting' ? 'Mendeteksi lokasi...' : 'Aktifkan lokasi')}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push(routes.customer.profile)} accessibilityRole="button">
            <Avatar size="md" name={displayName} source={avatarUrl ? { uri: avatarUrl } : undefined} />
          </Pressable>
        </View>

        <View className="px-4 pb-4">
          <Text className="text-2xl font-bold text-slate-900">Halo, {displayName.split(' ')[0]}! 👋</Text>
          <Text className="text-xs text-slate-500 mt-1">Siap tampil rapi hari ini?</Text>
        </View>

        {/* Promo hero banner */}
        <HomeHeroBanner onPress={() => router.push(routes.customer.explore)} />

        {/* Search + filter */}
        <HomeSearchBar
          onPressSearch={() => router.push(routes.customer.explore)}
          onPressFilter={() => setFilterVisible(true)}
        />
        <HomeFilterSheet
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          categories={homeData?.featuredServices?.map((f) => ({ id: f.id, label: f.title, isActive: false })) || []}
          onApply={handleApplyFilter}
        />

        {/* Active Booking Banner (if ongoing appointment exists) */}
        {homeData?.activeBooking ? (
          <View className="px-4 pb-5">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(customer)/booking/detail/[bookingId]',
                  params: { bookingId: homeData.activeBooking!.id },
                })
              }
              className="rounded-2xl bg-amber-500 p-4 border border-amber-600 shadow-sm"
            >
              <View className="flex-row items-center justify-between border-b border-amber-400 pb-2 mb-2">
                <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  💈 Pesanan Aktif Anda
                </Text>
                <View className="rounded-full bg-slate-900 px-2.5 py-0.5">
                  <Text className="text-[10px] font-bold text-amber-400 capitalize">
                    {homeData.activeBooking.status === 'in_progress'
                      ? 'Sedang Dilayani'
                      : homeData.activeBooking.status === 'accepted'
                      ? 'Disetujui'
                      : 'Menunggu Barber'}
                  </Text>
                </View>
              </View>
              <Text className="text-base font-extrabold text-slate-900">
                {homeData.activeBooking.serviceName || 'Layanan Cukur'}
              </Text>
              <Text className="text-xs font-semibold text-slate-900 mt-0.5">
                Barber: {homeData.activeBooking.barberName || 'Master Barber'} • {homeData.activeBooking.bookingDate} {homeData.activeBooking.bookingTime}
              </Text>
              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-[11px] text-slate-900 underline font-bold">
                  Lihat Detail Pesanan ›
                </Text>
                {['accepted', 'in_progress'].includes(homeData.activeBooking.status || '') && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: '/(customer)/booking/tracking/[bookingId]',
                        params: { bookingId: String(homeData.activeBooking?.id || '') },
                      });
                    }}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-800"
                  >
                    <Text className="text-xs font-bold text-amber-400">📍 Lacak Barber</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Backend-unavailable banner */}
        {backendUnavailable ? (
          <View className="mx-4 mb-5 rounded-2xl bg-red-50 border border-red-200 p-4">
            <Text className="text-sm font-semibold text-red-800 mb-1">Gagal memuat sebagian data</Text>
            <Text className="text-xs text-red-600 mb-3">{homeError}</Text>
            <AppButton label="Coba Lagi" onPress={() => refresh()} variant="secondary" fullWidth={false} />
          </View>
        ) : null}

        {/* Discovery map teaser */}
        <View className="mx-4 mb-6">
          <Pressable
            onPress={() => router.push(routes.customer.explore)}
            className="relative h-40 overflow-hidden rounded-2xl border border-slate-200"
          >
            {locationUiStatus === 'granted' ? (
              <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }}>
                <Camera
                  initialViewState={{
                    center: [mapCenter.longitude, mapCenter.latitude],
                    zoom: MAP_CONFIG.defaultViewport.zoom,
                  }}
                />
                {mapMarkers.map((barber) => (
                  <Marker
                    key={barber.barberId}
                    lngLat={[barber.longitude as number, barber.latitude as number]}
                    id={`home-barber-${barber.barberId}`}
                  >
                    <View className="h-4 w-4 rounded-full border-2 border-white bg-[#D2691E]" />
                  </Marker>
                ))}
              </Map>
            ) : (
              <View className="flex-1 items-center justify-center bg-[#EDEFFB] px-4">
                <Text className="text-2xl mb-1">🗺️</Text>
                <Text className="text-xs font-semibold text-[#363062] text-center">
                  Aktifkan lokasi untuk melihat peta barber di sekitar Anda
                </Text>
              </View>
            )}
            <View className="absolute bottom-2 right-2 rounded-lg bg-white/95 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-slate-700">Lihat Peta ›</Text>
            </View>
          </Pressable>
        </View>

        {/* Barber Terdekat */}
        <HomeSection
          title="Barber Terdekat"
          barbers={nearestBarbers}
          loading={homeLoading && !refreshing}
          emptyMessage={
            locationUiStatus === 'granted'
              ? 'Belum ada barber aktif di sekitar lokasi Anda.'
              : 'Aktifkan lokasi untuk melihat barber terdekat.'
          }
          emptyActionLabel={locationUiStatus === 'granted' ? undefined : 'Aktifkan Lokasi'}
          onEmptyAction={locationUiStatus === 'granted' ? undefined : requestLocation}
          onSeeAll={() => router.push({ pathname: routes.customer.explore, params: { sort: 'nearest' } })}
          onPressBarber={handlePressBarber}
        />

        {/* Rekomendasi untuk Anda */}
        <HomeSection
          title="Rekomendasi untuk Anda"
          barbers={homeData?.topRatedBarbers || []}
          loading={homeLoading && !refreshing}
          emptyMessage="Belum ada barber terdaftar. Barber aktif akan muncul di sini setelah diverifikasi."
          onSeeAll={() => router.push({ pathname: routes.customer.explore, params: { sort: 'highest_rating' } })}
          onPressBarber={handlePressBarber}
        />

        {/* Home Service Tersedia */}
        <HomeSection
          title="Home Service Tersedia"
          barbers={homeData?.homeServiceBarbers || []}
          loading={homeLoading && !refreshing}
          emptyMessage="Belum ada barber yang melayani datang ke rumah."
          onSeeAll={() =>
            router.push({ pathname: routes.customer.explore, params: { serviceType: 'customer_home' } })
          }
          onPressBarber={handlePressBarber}
        />

        {/* Category Chips / Service Catalog */}
        <View className="px-4 pb-6">
          <Text className="text-base font-bold text-slate-900 mb-3">Kategori Layanan</Text>
          {homeData?.featuredServices && homeData.featuredServices.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
              {homeData.featuredServices.map((cat, idx) => (
                <Pressable
                  key={cat.id || `cat-feat-${idx}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/explore',
                      params: { category: cat.id },
                    })
                  }
                  className="rounded-xl bg-white px-4 py-3 border border-slate-200 shadow-sm mr-2"
                >
                  <Text className="font-bold text-slate-900 text-sm">{cat.title}</Text>
                  <Text className="text-xs text-slate-500 mt-1">{cat.subtitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-xs text-slate-500">Memuat kategori...</Text>
          )}
        </View>

        <View className="h-6" />
      </ScrollView>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
