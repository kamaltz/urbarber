import { AppButton } from '@/components/ui/AppButton';
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

  // Revenue calculation: Batch 08 - ONLY bookings with status === 'completed' AND paymentStatus === 'paid'.
  // Sums totalAmount (base service value) + homeServiceFee + tipAmount --
  // both the latter are part of the barber's own operational value (never
  // applicationFee), so excluding them under-reported real earnings on Home
  // Service or tipped bookings.
  const barberRevenueOf = (b: BarberBooking) => (b.totalAmount || 0) + (b.homeServiceFee || 0) + (b.tipAmount || 0);

  const currentMonthRevenue = completedBookings
    .filter(
      (b) =>
        (b.paymentStatus === 'paid') &&
        (b.bookingDate || b.createdAt || '').startsWith(currentMonthYear)
    )
    .reduce((sum, b) => sum + barberRevenueOf(b), 0);

  const totalCompletedRevenue = completedBookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + barberRevenueOf(b), 0);

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Analisis Performa & Transaksi" />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <View className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <Text className="text-rose-700 text-xs font-bold">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchAnalysisData} variant="secondary" className="mt-2" />
          </View>
        ) : null}

        {/* Total Revenue Overview Hero Card */}
        <View className="mb-5 p-5 bg-[#363062] rounded-2xl shadow-xs border border-white/10">
          <Text className="text-[#D2691E] text-xs font-bold uppercase tracking-wider">
            Nilai Transaksi Layanan (Bulan Ini)
          </Text>
          <Text className="text-white font-extrabold text-3xl mt-1.5">
            {formatCurrency(currentMonthRevenue)}
          </Text>
          <View className="mt-3 rounded-full bg-white/10 px-3 py-1 self-start border border-white/15">
            <Text className="text-slate-200 text-xs font-medium">
              Total Kumulatif Lunas: {formatCurrency(totalCompletedRevenue)}
            </Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 p-4 items-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 mb-1 border border-emerald-200">
              <SymbolIcon name="checkmark.circle.fill" size={20} color="#10b981" />
            </View>
            <Text className="text-2xl font-extrabold text-[#363062] mt-1">{completedBookings.length}</Text>
            <Text className="text-slate-500 text-[11px] font-medium text-center mt-0.5">Selesai</Text>
          </View>

          <View className="flex-1 p-4 items-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50 mb-1 border border-rose-200">
              <SymbolIcon name="xmark.circle.fill" size={20} color="#ef4444" />
            </View>
            <Text className="text-2xl font-extrabold text-[#363062] mt-1">
              {cancelledBookings.length + rejectedBookings.length}
            </Text>
            <Text className="text-slate-500 text-[11px] font-medium text-center mt-0.5">Dibatalkan</Text>
          </View>

          <View className="flex-1 p-4 items-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 mb-1 border border-amber-200">
              <SymbolIcon name="star.fill" size={20} color="#f59e0b" />
            </View>
            <Text className="text-2xl font-extrabold text-[#363062] mt-1">
              {(profile as any)?.ratingAverage ? Number((profile as any).ratingAverage).toFixed(1) : '5.0'}
            </Text>
            <Text className="text-slate-500 text-[11px] font-medium text-center mt-0.5">Rating</Text>
          </View>
        </View>

        {/* Recent Transaction History Section */}
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="font-bold text-[#363062] text-base">Riwayat Transaksi Terakhir</Text>
          <View className="rounded-full bg-[#EDEFFB] px-2.5 py-0.5">
            <Text className="text-[11px] font-bold text-[#363062]">
              {completedBookings.length} Transaksi
            </Text>
          </View>
        </View>

        {completedBookings.length === 0 ? (
          <View className="p-6 items-center rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#EDEFFB] border border-[#363062]/10 mb-2">
              <SymbolIcon name="clock" size={28} color="#363062" />
            </View>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Belum ada transaksi selesai lunas yang tercatat.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5 mb-8">
            {completedBookings.slice(0, 10).map((b) => (
              <View
                key={b.bookingId}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="font-bold text-[#363062] text-sm">
                    {b.customerName || 'Pelanggan'}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5 font-medium">
                    {b.bookingDate} • {b.bookingTime}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-extrabold text-[#D2691E] text-sm">
                    +{formatCurrency(b.totalAmount || 0)}
                  </Text>
                  <View className="mt-0.5 rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    <Text className="text-emerald-800 font-bold text-[9px]">Selesai Lunas ✓</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
