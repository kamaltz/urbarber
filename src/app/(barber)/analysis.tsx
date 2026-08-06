import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberBooking, BarberProfile } from '@/features/barbers/types/barber';
import { formatCurrency } from '@/utils/formatters';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

export default function BarberAnalysisScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [bookings, setBookings] = useState<BarberBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysisData = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const [profData, bookData] = await Promise.all([
        barberRepository.getBarberProfile(barberId),
        barberRepository.getBarberBookings(barberId),
      ]);
      setProfile(profData);
      setBookings(bookData);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data analisis performa.');
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
      barberRepository.getBarberBookings(barberId),
    ])
      .then(([profData, bookData]) => {
        if (!isMounted) return;
        setProfile(profData);
        setBookings(bookData);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat data analisis performa.');
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
    fetchAnalysisData();
  };

  // Strictly bounded metrics from real Firestore booking records
  const currentMonthYear = new Date().toISOString().substring(0, 7);
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  const rejectedBookings = bookings.filter((b) => b.status === 'rejected');

  // Revenue calculation: ONLY bookings with status === 'completed' AND paymentStatus === 'completed' | 'paid'
  const currentMonthRevenue = completedBookings
    .filter(
      (b) =>
        (b.paymentStatus === 'completed' || (b as any).paymentStatus === 'paid') &&
        (b.bookingDate || b.createdAt || '').startsWith(currentMonthYear)
    )
    .reduce((sum, b) => sum + (b.totalAmount || (b as any).totalPrice || 0), 0);

  const totalCompletedRevenue = completedBookings
    .filter((b) => b.paymentStatus === 'completed' || (b as any).paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.totalAmount || (b as any).totalPrice || 0), 0);

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Analisis Performa & Transaksi" />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchAnalysisData} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {/* Total Revenue Overview */}
        <AppCard className="mb-4 p-5 bg-slate-900 border-0">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Nilai Transaksi Layanan (Bulan Ini)
          </Text>
          <Text className="text-white font-extrabold text-3xl mt-1">
            {formatCurrency(currentMonthRevenue)}
          </Text>
          <Text className="text-slate-400 text-xs mt-2">
            Total Kumulatif Lunas: {formatCurrency(totalCompletedRevenue)}
          </Text>
        </AppCard>

        {/* Metrics Grid */}
        <View className="flex-row gap-3 mb-6">
          <AppCard className="flex-1 p-4 items-center">
            <SymbolIcon name="checkmark.circle.fill" size={24} color="#10b981" />
            <Text className="text-2xl font-extrabold text-slate-900 mt-2">{completedBookings.length}</Text>
            <Text className="text-slate-500 text-xs text-center mt-0.5">Pesanan Selesai</Text>
          </AppCard>

          <AppCard className="flex-1 p-4 items-center">
            <SymbolIcon name="xmark.circle.fill" size={24} color="#ef4444" />
            <Text className="text-2xl font-extrabold text-slate-900 mt-2">
              {cancelledBookings.length + rejectedBookings.length}
            </Text>
            <Text className="text-slate-500 text-xs text-center mt-0.5">Dibatalkan/Ditolak</Text>
          </AppCard>

          <AppCard className="flex-1 p-4 items-center">
            <SymbolIcon name="star.fill" size={24} color="#f59e0b" />
            <Text className="text-2xl font-extrabold text-slate-900 mt-2">
              {(profile as any)?.ratingAverage ? Number((profile as any).ratingAverage).toFixed(1) : '5.0'}
            </Text>
            <Text className="text-slate-500 text-xs text-center mt-0.5">Rating Rata-rata</Text>
          </AppCard>
        </View>

        {/* Recent Transaction History */}
        <Text className="font-bold text-slate-900 text-base mb-3">Riwayat Transaksi Terakhir</Text>
        {completedBookings.length === 0 ? (
          <AppCard className="p-6 items-center">
            <SymbolIcon name="clock" size={32} color="#94a3b8" />
            <Text className="text-slate-500 text-xs text-center mt-2">
              Belum ada transaksi selesai lunas yang tercatat.
            </Text>
          </AppCard>
        ) : (
          <View className="gap-2 mb-8">
            {completedBookings.slice(0, 10).map((b) => (
              <View
                key={b.bookingId}
                className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 text-sm">
                    {b.customerName || 'Pelanggan'}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {b.bookingDate} • {b.bookingTime}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-extrabold text-emerald-600 text-sm">
                    +{formatCurrency(b.totalAmount || (b as any).totalPrice || 0)}
                  </Text>
                  <Text className="text-emerald-700 font-semibold text-[10px]">Selesai Lunas</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
