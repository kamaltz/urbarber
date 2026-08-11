import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
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
        <View className="p-5 rounded-2xl bg-rose-50 border border-rose-200 my-4">
          <Text className="text-sm font-bold text-rose-800 text-center mb-1">
            Gagal Memuat Barber Favorit
          </Text>
          <Text className="text-xs text-rose-600 text-center mb-4">{error}</Text>
          <AppButton label="Coba Lagi" onPress={refresh} variant="secondary" />
        </View>
      ) : favoriteBarbers.length > 0 ? (
        <View className="gap-3.5">
          {favoriteBarbers.map((barber) => (
            <Pressable
              key={barber.barberId}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/barber/[barberId]',
                  params: { barberId: barber.barberId },
                })
              }
              className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs active:bg-slate-50"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                  <View className="rounded-full p-0.5 border border-[#363062]/20">
                    <Avatar
                      size="md"
                      name={barber.name}
                      source={barber.imageUrl ? { uri: barber.imageUrl } : undefined}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="font-bold text-[#363062] text-base">{barber.name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
                        📍 {barber.location || 'Garut'}
                      </Text>
                    </View>

                    {barber.rating !== undefined && (
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <Rating value={barber.rating} size="sm" />
                        <Text className="text-xs font-bold text-[#363062]">
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
                  className="rounded-full bg-rose-50 p-2.5 border border-rose-200 active:bg-rose-100"
                  accessibilityLabel="Hapus dari favorit"
                >
                  <Text className="text-base">❤️</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="py-6">
          <EmptyState
            title="Belum Ada Barber Favorit"
            description="Tandai barber pilihan Anda saat menjelajah untuk mengakses layanan langganan secara instan di sini."
            icon={
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#EDEFFB] border border-[#363062]/10">
                <Text className="text-3xl">🤍</Text>
              </View>
            }
            actionLabel="Jelajahi Barber Terdekat"
            onActionPress={() => router.push(routes.customer.explore)}
            className="border-slate-200 bg-white shadow-xs"
          />
        </View>
      )}
    </CustomerScreen>
  );
}
