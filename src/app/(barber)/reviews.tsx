import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
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
      <View className="flex-row gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <SymbolIcon
            key={star}
            name="star.fill"
            size={14}
            color={star <= rating ? '#f59e0b' : '#cbd5e1'}
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
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchReviews} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {/* Rating Summary Header */}
        <AppCard className="mb-6 p-6 items-center bg-slate-900 border-0">
          <Text className="text-amber-400 font-extrabold text-4xl">
            {(profile as any)?.ratingAverage ? Number((profile as any).ratingAverage).toFixed(1) : '5.0'}
          </Text>
          <View className="mt-2">{renderStars(Math.round((profile as any)?.ratingAverage || 5))}</View>
          <Text className="text-slate-400 text-xs mt-2">
            Berdasarkan {(profile as any)?.reviewCount || reviews.length} ulasan pelanggan
          </Text>
        </AppCard>

        {/* Reviews List */}
        <Text className="font-bold text-slate-900 text-base mb-3">Daftar Ulasan Pelanggan</Text>
        {reviews.length === 0 ? (
          <AppCard className="p-8 items-center justify-center my-4">
            <SymbolIcon name="star" size={40} color="#94a3b8" />
            <Text className="text-slate-700 font-bold text-base mt-3">Belum Ada Ulasan</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Ulasan dari pelanggan setelah layanan selesai akan tampil di sini.
            </Text>
          </AppCard>
        ) : (
          <View className="gap-3 mb-8">
            {reviews.map((rev) => (
              <AppCard key={rev.reviewId || (rev as any).id} className="p-4 gap-2">
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
                  <Text className="font-bold text-slate-900 text-sm">
                    {rev.customerName || 'Pelanggan'}
                  </Text>
                  {renderStars(rev.rating || 5)}
                </View>
                <Text className="text-slate-700 text-xs mt-1">
                  &quot;{rev.comment || 'Layanan sangat memuaskan!'}&quot;
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1">
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('id-ID') : ''}
                </Text>
              </AppCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
