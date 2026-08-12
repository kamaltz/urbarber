import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { Rating } from '@/components/ui/Rating';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useBarberDetail } from '@/features/customer/hooks/use-barber-detail';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

export function formatIDR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '30 menit';
  return `${minutes} menit`;
}

export default function BarberDetailScreen() {
  const { user } = useAuth();
  const customerId = user?.uid || '';

  const params = useLocalSearchParams<{ barberId: string }>();
  const barberId = params.barberId ? String(params.barberId).trim() : '';

  const { barber, services, isFavorite, loading, error, toggleFavorite, refresh } =
    useBarberDetail(barberId, customerId);

  if (!barberId) {
    return (
      <CustomerScreen title="Detail Barber">
        <EmptyState
          title="ID Barber Tidak Valid"
          description="Parameter barberId tidak ditemukan pada URL."
          actionLabel="Kembali ke Jelajah"
          onActionPress={() => router.replace(routes.customer.explore)}
        />
      </CustomerScreen>
    );
  }

  if (loading) {
    return (
      <CustomerScreen title="Detail Barber">
        <View className="py-16 items-center">
          <Loading />
        </View>
      </CustomerScreen>
    );
  }

  if (error || !barber) {
    return (
      <CustomerScreen title="Detail Barber">
        <View className="p-5 rounded-2xl bg-rose-50 border border-rose-200 my-4">
          <Text className="text-sm font-bold text-rose-800 text-center mb-1">
            Barber Tidak Ditemukan
          </Text>
          <Text className="text-xs text-rose-600 text-center mb-4">
            {error || 'Barber tidak ditemukan atau tidak tersedia secara publik.'}
          </Text>
          <AppButton label="Coba Lagi" onPress={refresh} variant="secondary" />
        </View>
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen
      title="Detail Barber"
      description="Profil lengkap dan katalog layanan barber pilihan."
      scroll={false}
      action={{
        label: 'Pilih Barber & Pesan',
        onPress: () =>
          router.push({
            pathname: routes.customer.bookingOptions,
            params: { barberId: barber.id, barberName: barber.displayName },
          }),
      }}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Barber Header Card */}
        <View className="rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80 mb-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              <View className="rounded-full p-0.5 border border-[#363062]/20">
                <Avatar
                  size="lg"
                  name={barber.displayName}
                  source={barber.profileImageUrl ? { uri: barber.profileImageUrl } : undefined}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-lg font-bold text-[#363062]">{barber.displayName}</Text>
                  {barber.verified && (
                    <View className="rounded-full bg-emerald-100 px-2.5 py-0.5 border border-emerald-200">
                      <Text className="text-[10px] font-bold text-emerald-800">Verified ✓</Text>
                    </View>
                  )}
                </View>
                <Text className="mt-1 text-xs text-slate-500 font-medium">
                  📍 {barber.address || 'Garut, Jawa Barat'}
                </Text>
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Rating value={barber.ratingAverage} size="sm" />
                  <Text className="text-xs font-bold text-[#363062]">
                    {barber.ratingAverage.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    ({barber.reviewCount} ulasan)
                  </Text>
                </View>
              </View>
            </View>

            {/* Favorite Toggle Heart */}
            <Pressable
              onPress={toggleFavorite}
              className={`rounded-full p-2.5 border active:opacity-80 ${
                isFavorite
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
              accessibilityLabel="Tambah atau hapus favorit"
            >
              <Text className="text-lg">{isFavorite ? '❤️' : '🤍'}</Text>
            </Pressable>
          </View>

          {/* Description */}
          {barber.description ? (
            <View className="mt-4 pt-3 border-t border-slate-100">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider mb-1">
                Tentang Barber
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {barber.description}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Offered Services List Catalog */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-[#363062]">Katalog Layanan</Text>
            <View className="rounded-full bg-[#EDEFFB] px-2.5 py-0.5">
              <Text className="text-[11px] font-bold text-[#363062]">
                {services.length} Layanan
              </Text>
            </View>
          </View>

          {services.length > 0 ? (
            <View className="gap-3">
              {services.map((service, idx) => (
                <View
                  key={service.serviceId || service.name ? `svc-${service.serviceId || service.name}` : `barber-svc-${idx}`}
                  className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-base font-bold text-[#363062]">{service.name}</Text>
                    <Text className="text-sm font-extrabold text-[#D2691E]">
                      {formatIDR(service.price)}
                    </Text>
                  </View>
                  {service.description ? (
                    <Text className="text-xs text-slate-500 mb-2.5 leading-4">{service.description}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-lg bg-[#EDEFFB] px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-[#363062]">
                        ⏱️ {formatDurationMinutes(service.durationMinutes)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="rounded-2xl bg-white p-6 items-center border border-slate-200/80 shadow-xs">
              <Text className="text-xs text-slate-500 text-center">
                Belum ada daftar layanan aktif untuk barber ini.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
