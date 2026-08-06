import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { Rating } from '@/components/ui/Rating';
import { routes } from '@/constants/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCustomerFavorites } from '@/features/customer/hooks/use-customer-favorites';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const customerId = user?.uid || '';

  const { favoritesData, loading, error, toggleFavorite, refresh } = useCustomerFavorites(customerId);

  const favoriteBarbers = favoritesData?.favoriteBarbers || [];

  return (
    <CustomerScreen
      title="Barber Favorit"
      description="Daftar barber langganan dan pilihan utama Anda."
      showTabs
    >
      {loading ? (
        <View className="py-12 items-center">
          <Loading />
        </View>
      ) : error ? (
        <View className="p-4 rounded-xl bg-red-50 border border-red-200 my-4">
          <Text className="text-sm font-semibold text-red-800 text-center mb-1">
            Gagal Memuat Barber Favorit
          </Text>
          <Text className="text-xs text-red-600 text-center mb-3">{error}</Text>
          <AppButton label="Coba Lagi" onPress={refresh} variant="secondary" />
        </View>
      ) : favoriteBarbers.length > 0 ? (
        <View className="gap-3">
          {favoriteBarbers.map((barber) => (
            <AppCard
              key={barber.barberId}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/barber/[barberId]',
                  params: { barberId: barber.barberId },
                })
              }
              className="p-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <Avatar
                    size="md"
                    name={barber.name}
                    source={barber.imageUrl ? { uri: barber.imageUrl } : undefined}
                  />
                  <View className="flex-1">
                    <Text className="font-bold text-slate-900 text-base">{barber.name}</Text>
                    <Text className="text-xs text-slate-600 mt-1" numberOfLines={1}>
                      📍 {barber.location || 'Garut'}
                    </Text>
                    {barber.rating !== undefined && (
                      <View className="mt-1 flex-row items-center gap-1">
                        <Rating value={barber.rating} size="sm" />
                        <Text className="text-xs font-semibold text-slate-700">
                          {barber.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Remove Favorite Button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void toggleFavorite(barber.barberId);
                  }}
                  className="rounded-full bg-rose-50 p-2 border border-rose-200"
                  accessibilityLabel="Hapus dari favorit"
                >
                  <Text className="text-base">❤️</Text>
                </Pressable>
              </View>
            </AppCard>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Belum Ada Barber Favorit"
          description="Beri tanda hati pada barber pilihan Anda di halaman Cari Barber atau Detail Barber."
          actionLabel="Jelajahi Barber"
          onActionPress={() => router.push(routes.customer.explore)}
        />
      )}
    </CustomerScreen>
  );
}
