import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberProfile, BarberReview } from '@/features/barbers/types/barber';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

export default function BarberReviewsScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [reviews, setReviews] = useState<BarberReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const [profData, reviewData] = await Promise.all([
        barberRepository.getBarberProfile(barberId),
        barberRepository.getBarberReviews(barberId),
      ]);
      setProfile(profData);
      setReviews(reviewData);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat ulasan pelanggan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId) return;
    Promise.all([
      barberRepository.getBarberProfile(barberId),
      barberRepository.getBarberReviews(barberId),
    ])
      .then(([profData, reviewData]) => {
        if (!isMounted) return;
        setProfile(profData);
        setReviews(reviewData);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat ulasan pelanggan.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [barberId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <SymbolIcon
            key={star}
            name="star.fill"
            size={14}
            color={star <= rating ? '#D2691E' : '#cbd5e1'}
          />
        ))}
      </View>
    );
  };

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Ulasan & Rating Pelanggan" />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <View className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <Text className="text-rose-700 text-xs font-bold">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchReviews} variant="secondary" className="mt-2" />
          </View>
        ) : null}

        {/* Rating Summary Header Card */}
        <View className="mb-5 p-6 items-center bg-[#363062] rounded-2xl shadow-xs border border-slate-200/20">
          <Text className="text-[#D2691E] font-extrabold text-4xl">
            {(profile as any)?.ratingAverage ? Number((profile as any).ratingAverage).toFixed(1) : '5.0'}
          </Text>
          <View className="mt-2">{renderStars(Math.round((profile as any)?.ratingAverage || 5))}</View>
          <View className="mt-2.5 rounded-full bg-white/10 px-3 py-1 border border-white/15">
            <Text className="text-slate-200 text-xs font-medium">
              Berdasarkan {(profile as any)?.reviewCount || reviews.length} ulasan pelanggan
            </Text>
          </View>
        </View>

        {/* Reviews List Header */}
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="font-bold text-[#363062] text-base">Daftar Ulasan Pelanggan</Text>
          <View className="rounded-full bg-[#EDEFFB] px-2.5 py-0.5">
            <Text className="text-[11px] font-bold text-[#363062]">{reviews.length} Ulasan</Text>
          </View>
        </View>

        {reviews.length === 0 ? (
          <View className="p-8 items-center justify-center my-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#EDEFFB] border border-[#363062]/10 mb-3">
              <Text className="text-3xl">⭐</Text>
            </View>
            <Text className="text-[#363062] font-bold text-base mt-1">Belum Ada Ulasan</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Ulasan dari pelanggan setelah layanan selesai akan tampil di sini.
            </Text>
          </View>
        ) : (
          <View className="gap-3 mb-8">
            {reviews.map((rev) => (
              <View key={rev.reviewId || (rev as any).id} className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                  <Text className="font-bold text-[#363062] text-sm">
                    {rev.customerName || 'Pelanggan'}
                  </Text>
                  {renderStars(rev.rating || 5)}
                </View>
                <Text className="text-slate-600 text-xs mt-1 leading-relaxed">
                  &quot;{rev.comment || 'Layanan sangat memuaskan!'}&quot;
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1 font-medium">
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
