import { CustomerBottomNavigation } from '@/components/navigation/CustomerBottomNavigation';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { Rating } from '@/components/ui/Rating';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerHome } from '@/features/customer/hooks/use-customer-home';
import { useCustomerProfile } from '@/features/customer/hooks/use-customer-profile';
import { firebaseAuth } from '@/lib/firebase';
import { router } from 'expo-router';
import { useCallback } from 'react';
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
  const { homeData, loading: homeLoading, refreshing, error: homeError, refresh } = useCustomerHome(customerId);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

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

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Pelanggan';
  const avatarUrl =
    profile?.profileImageUrl ||
    user?.photoURL ||
    firebaseAuth.currentUser?.photoURL;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Beranda" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#D2691E']} />}
      >
        {/* User Greeting Section with Role Badge */}
        <View className="px-4 pt-6 pb-4">
          <View className="flex-row items-center gap-3">
            <Avatar
              size="lg"
              name={displayName}
              source={avatarUrl ? { uri: avatarUrl } : undefined}
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-slate-900">
                  Halo, {displayName.split(' ')[0]}! 👋
                </Text>
              </View>
              <View className="flex-row items-center gap-2 mt-1">
                <View className="rounded-full bg-amber-100 px-2.5 py-0.5 border border-amber-300">
                  <Text className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    👤 Pelanggan
                  </Text>
                </View>
                <Text className="text-xs text-slate-500">Siap tampil rapi?</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Active Booking Banner (if ongoing appointment exists) */}
        {homeData?.activeBooking ? (
          <View className="px-4 pb-4">
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

        {/* Quick Actions */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">Aksi Cepat</Text>
          <AppButton
            label="Cari Barber Terdekat"
            onPress={() => router.push(routes.customer.explore)}
            variant="primary"
            className="mb-2"
          />
          <View className="flex-row gap-2">
            <AppButton
              label="Barber Favorit"
              onPress={() => router.push(routes.customer.favorites)}
              variant="secondary"
              className="flex-1"
            />
            <AppButton
              label="Riwayat Booking"
              onPress={() => router.push(routes.customer.bookingHistory)}
              variant="secondary"
              className="flex-1"
            />
          </View>
        </View>

        {/* Category Chips / Service Catalog */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">Kategori Layanan</Text>
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

        {/* Featured / Recommended Barbers Section */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">Rekomendasi Barber Active</Text>
            <Pressable onPress={() => router.push(routes.customer.explore)}>
              <Text className="text-sm text-[#D2691E] font-semibold">Lihat Semua</Text>
            </Pressable>
          </View>

          {homeLoading && !refreshing ? (
            <View className="py-6 items-center">
              <Loading />
            </View>
          ) : homeError ? (
            <View className="p-4 rounded-xl bg-red-50 border border-red-200 my-2">
              <Text className="text-sm text-red-700 text-center mb-2">{homeError}</Text>
              <AppButton label="Coba Lagi" onPress={() => refresh()} variant="secondary" />
            </View>
          ) : homeData?.barberSuggestions && homeData.barberSuggestions.length > 0 ? (
            homeData.barberSuggestions.slice(0, 5).map((barber, idx) => (
              <AppCard
                key={barber.barberId || `barber-suggest-${idx}`}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/barber/[barberId]',
                    params: { barberId: barber.barberId },
                  })
                }
                className="mb-3 p-4"
              >
                <View className="flex-row items-center gap-3">
                  <Avatar
                    size="md"
                    name={barber.name}
                    source={barber.imageUrl ? { uri: barber.imageUrl } : undefined}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-slate-900 text-base">{barber.name}</Text>
                      <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-emerald-800">
                          {barber.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-slate-600 mt-1" numberOfLines={1}>
                      📍 {barber.location || 'Garut'}
                    </Text>
                    {barber.rating !== undefined && (
                      <View className="mt-1 flex-row items-center gap-1">
                        <Rating value={barber.rating} size="sm" />
                        <Text className="text-xs font-semibold text-slate-700">
                          ({barber.rating.toFixed(1)})
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </AppCard>
            ))
          ) : (
            <EmptyState
              title="Belum ada barber terdaftar"
              description="Barber aktif akan muncul di sini setelah diverifikasi."
              actionLabel="Jelajahi Katalog"
              onActionPress={() => router.push(routes.customer.explore)}
            />
          )}
        </View>

        <View className="h-6" />
      </ScrollView>
      <CustomerBottomNavigation />
    </SafeAreaView>
  );
}
