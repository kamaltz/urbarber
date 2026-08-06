import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberBooking, BarberProfile } from '@/features/barbers/types/barber';
import { formatCurrency } from '@/utils/formatters';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function BarberHomeScreen() {
  const { user, logout } = useAuth();
  const barberId = user?.uid || '';

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [bookings, setBookings] = useState<BarberBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
      setError(err?.message || 'Gagal memuat data ringkasan dashboard.');
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
        setError(err?.message || 'Gagal memuat data ringkasan dashboard.');
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
    loadData();
  };

  // Metric Computations (bounded real data)
  const pendingPaidCount = bookings.filter(
    (b) => b.status === 'pending' && b.paymentStatus === 'completed'
  ).length;
  const acceptedCount = bookings.filter((b) => b.status === 'accepted').length;
  const inProgressCount = bookings.filter((b) => b.status === 'in_progress').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  // Monthly revenue calculation: strictly status === 'completed' && paymentStatus === 'completed' ('paid')
  const currentMonthYear = new Date().toISOString().substring(0, 7); // YYYY-MM
  const currentMonthRevenue = bookings
    .filter(
      (b) =>
        b.status === 'completed' &&
        (b.paymentStatus === 'completed' || (b as any).paymentStatus === 'paid') &&
        (b.bookingDate || b.createdAt || '').startsWith(currentMonthYear)
    )
    .reduce((sum, b) => sum + (b.totalAmount || (b as any).totalPrice || 0), 0);

  const upcomingBookings = bookings
    .filter((b) => b.status === 'accepted' || b.status === 'in_progress')
    .slice(0, 5);

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Dashboard Master Barber" showBackButton={false} />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Barber Info Header */}
        <AppCard className="mb-4 bg-slate-900 border-0 p-5">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-amber-500 items-center justify-center">
              <Text className="text-slate-900 font-bold text-xl">
                {(profile?.name || user?.displayName || 'B')[0].toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                {profile?.shopName || profile?.name || user?.displayName || 'Master Barber'}
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                {profile?.shopAddress || user?.email}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-2">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-emerald-400 text-xs font-medium">Akun Terverifikasi</Text>
              </View>
            </View>
          </View>
        </AppCard>

        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={loadData} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {/* Revenue Banner */}
        <AppCard className="mb-4 p-5 bg-emerald-600 border-0">
          <Text className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
            Pendapatan bulan ini
          </Text>
          <Text className="text-white font-extrabold text-3xl mt-1">
            {formatCurrency(currentMonthRevenue)}
          </Text>
          <Text className="text-emerald-200 text-xs mt-2">
            Dari {completedCount} pesanan selesai lunas
          </Text>
        </AppCard>

        {/* Quick Operations Grid */}
        <Text className="font-bold text-slate-900 text-base mb-3">Ringkasan Operasional</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          <TouchableOpacity
            className="flex-1 min-w-[45%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            onPress={() => router.push('/(barber)/(tabs)/bookings' as any)}>
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-500 text-xs font-medium">Perlu Respon</Text>
              <SymbolIcon name="scissors" size={18} color="#f59e0b" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{pendingPaidCount}</Text>
            <Text className="text-amber-600 text-[10px] font-semibold mt-1">Pesanan lunas baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 min-w-[45%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            onPress={() => router.push('/(barber)/(tabs)/bookings' as any)}>
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-500 text-xs font-medium">Disetujui</Text>
              <SymbolIcon name="checkmark.circle" size={18} color="#0284c7" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{acceptedCount}</Text>
            <Text className="text-sky-600 text-[10px] font-semibold mt-1">Siap dikerjakan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 min-w-[45%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            onPress={() => router.push('/(barber)/(tabs)/bookings' as any)}>
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-500 text-xs font-medium">Dalam Proses</Text>
              <SymbolIcon name="clock" size={18} color="#8b5cf6" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{inProgressCount}</Text>
            <Text className="text-purple-600 text-[10px] font-semibold mt-1">Sedang melayani</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 min-w-[45%] bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            onPress={() => router.push('/(barber)/analysis' as any)}>
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-500 text-xs font-medium">Selesai</Text>
              <SymbolIcon name="chart.bar.fill" size={18} color="#10b981" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 mt-2">{completedCount}</Text>
            <Text className="text-emerald-600 text-[10px] font-semibold mt-1">Total riwayat</Text>
          </TouchableOpacity>
        </View>

        {/* Action Shortcuts */}
        <Text className="font-bold text-slate-900 text-base mb-3">Kelola Layanan & Outlet</Text>
        <View className="gap-2 mb-6">
          <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between"
            onPress={() => router.push('/(barber)/(tabs)/services' as any)}>
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-sky-100 items-center justify-center">
                <SymbolIcon name="list.bullet" size={20} color="#0284c7" />
              </View>
              <View>
                <Text className="font-semibold text-slate-900 text-sm">Kelola Layanan & Harga</Text>
                <Text className="text-slate-500 text-xs">Tambah, edit harga, & status aktif</Text>
              </View>
            </View>
            <SymbolIcon name="chevron.right" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between"
            onPress={() => router.push('/(barber)/(tabs)/schedule' as any)}>
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-amber-100 items-center justify-center">
                <SymbolIcon name="calendar" size={20} color="#d97706" />
              </View>
              <View>
                <Text className="font-semibold text-slate-900 text-sm">Jadwal Operasional</Text>
                <Text className="text-slate-500 text-xs">Jam buka mingguan & tanggal libur</Text>
              </View>
            </View>
            <SymbolIcon name="chevron.right" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between"
            onPress={() => router.push('/(barber)/analysis' as any)}>
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-emerald-100 items-center justify-center">
                <SymbolIcon name="chart.bar.fill" size={20} color="#059669" />
              </View>
              <View>
                <Text className="font-semibold text-slate-900 text-sm">Analisis Transaksi</Text>
                <Text className="text-slate-500 text-xs">Statistik omset & performa outlet</Text>
              </View>
            </View>
            <SymbolIcon name="chevron.right" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between"
            onPress={() => router.push('/(barber)/reviews' as any)}>
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-purple-100 items-center justify-center">
                <SymbolIcon name="star.fill" size={20} color="#7c3aed" />
              </View>
              <View>
                <Text className="font-semibold text-slate-900 text-sm">Ulasan Pelanggan</Text>
                <Text className="text-slate-500 text-xs">Lihat rating & ulasan dari pelanggan</Text>
              </View>
            </View>
            <SymbolIcon name="chevron.right" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Upcoming Accepted Bookings */}
        <Text className="font-bold text-slate-900 text-base mb-3">Pesanan Mendatang</Text>
        {upcomingBookings.length === 0 ? (
          <AppCard className="mb-6 p-6 items-center">
            <SymbolIcon name="calendar" size={32} color="#94a3b8" />
            <Text className="text-slate-500 text-sm mt-2 text-center">
              Belum ada pesanan mendatang yang dikonfirmasi.
            </Text>
          </AppCard>
        ) : (
          <View className="gap-2 mb-6">
            {upcomingBookings.map((b) => (
              <TouchableOpacity
                key={b.bookingId}
                className="bg-white p-4 rounded-xl border border-slate-200 flex-row items-center justify-between"
                onPress={() => router.push(`/(barber)/booking/${b.bookingId}` as any)}>
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 text-sm">
                    {b.customerName || 'Pelanggan'}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {b.bookingDate} • Jam {b.bookingTime}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-slate-900 text-sm">
                    {formatCurrency(b.totalAmount || (b as any).totalPrice || 0)}
                  </Text>
                  <View className="bg-sky-100 px-2 py-0.5 rounded-full mt-1">
                    <Text className="text-sky-700 font-semibold text-[10px]">
                      {b.status === 'in_progress' ? 'Dalam Proses' : 'Disetujui'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <AppButton label="Keluar Akun" onPress={logout} variant="secondary" className="mb-8 w-full" />
      </ScrollView>
    </View>
  );
}
