import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberBooking } from '@/features/barbers/types/barber';
import { formatCurrency } from '@/utils/formatters';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type TabType = 'requests' | 'active' | 'history';

export default function BarberBookingsScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [bookings, setBookings] = useState<BarberBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const data = await barberRepository.getBarberBookings(barberId);
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar pesanan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId) return;
    barberRepository
      .getBarberBookings(barberId)
      .then((data) => {
        if (!isMounted) return;
        setBookings(data);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat daftar pesanan.');
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
    fetchBookings();
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'requests') return b.status === 'pending';
    if (activeTab === 'active') return b.status === 'accepted' || b.status === 'in_progress';
    if (activeTab === 'history')
      return b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (booking: BarberBooking) => {
    if (booking.status === 'pending') {
      // Batch 08: Use canonical 'paid' status for payment verification
      const isPaid = booking.paymentStatus === 'paid';
      return (
        <View className={isPaid ? 'bg-emerald-100 px-2.5 py-1 rounded-full' : 'bg-amber-100 px-2.5 py-1 rounded-full'}>
          <Text className={isPaid ? 'text-emerald-800 font-bold text-xs' : 'text-amber-800 font-semibold text-xs'}>
            {isPaid ? '✓ Pembayaran Lunas (Siap)' : '⏳ Menunggu Pembayaran'}
          </Text>
        </View>
      );
    }
    if (booking.status === 'accepted') {
      return (
        <View className="bg-sky-100 px-2.5 py-1 rounded-full">
          <Text className="text-sky-800 font-semibold text-xs">Pesanan Disetujui</Text>
        </View>
      );
    }
    if (booking.status === 'in_progress') {
      return (
        <View className="bg-purple-100 px-2.5 py-1 rounded-full">
          <Text className="text-purple-800 font-semibold text-xs">Sedang Melayani</Text>
        </View>
      );
    }
    if (booking.status === 'completed') {
      return (
        <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
          <Text className="text-emerald-800 font-semibold text-xs">Selesai</Text>
        </View>
      );
    }
    if (booking.status === 'rejected') {
      return (
        <View className="bg-red-100 px-2.5 py-1 rounded-full">
          <Text className="text-red-800 font-semibold text-xs">Ditolak</Text>
        </View>
      );
    }
    return (
      <View className="bg-slate-100 px-2.5 py-1 rounded-full">
        <Text className="text-slate-600 font-semibold text-xs">Dibatalkan</Text>
      </View>
    );
  };

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Kelola Pesanan Pelanggan" showBackButton={false} />

      {/* Tabs Switcher */}
      <View className="flex-row bg-white p-1 border-b border-slate-200">
        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'requests' ? 'border-amber-500' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('requests')}>
          <Text
            className={`text-xs font-bold ${
              activeTab === 'requests' ? 'text-amber-600' : 'text-slate-500'
            }`}>
            Permintaan ({bookings.filter((b) => b.status === 'pending').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'active' ? 'border-amber-500' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('active')}>
          <Text
            className={`text-xs font-bold ${
              activeTab === 'active' ? 'text-amber-600' : 'text-slate-500'
            }`}>
            Aktif ({bookings.filter((b) => b.status === 'accepted' || b.status === 'in_progress').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === 'history' ? 'border-amber-500' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('history')}>
          <Text
            className={`text-xs font-bold ${
              activeTab === 'history' ? 'text-amber-600' : 'text-slate-500'
            }`}>
            Riwayat ({bookings.filter((b) => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchBookings} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {filteredBookings.length === 0 ? (
          <AppCard className="p-8 items-center justify-center my-6">
            <SymbolIcon name="calendar" size={40} color="#94a3b8" />
            <Text className="text-slate-700 font-bold text-base mt-3">Tidak Ada Pesanan</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              {activeTab === 'requests'
                ? 'Belum ada permintaan pesanan baru dari pelanggan.'
                : activeTab === 'active'
                ? 'Tidak ada pesanan aktif saat ini.'
                : 'Belum ada riwayat pesanan selesai.'}
            </Text>
          </AppCard>
        ) : (
          <View className="gap-3 mb-6">
            {filteredBookings.map((b) => (
              <TouchableOpacity
                key={b.bookingId}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                onPress={() => router.push(`/(barber)/booking/${b.bookingId}` as any)}>
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <View className="flex-row items-center gap-2">
                    <SymbolIcon name="person.fill" size={16} color="#475569" />
                    <Text className="font-bold text-slate-900 text-sm">{b.customerName || 'Pelanggan'}</Text>
                  </View>
                  {getStatusBadge(b)}
                </View>

                <View className="gap-1 mb-3">
                  <Text className="text-slate-600 text-xs font-medium">
                    🗓 Tanggal: <Text className="font-semibold text-slate-900">{b.bookingDate}</Text>
                  </Text>
                  <Text className="text-slate-600 text-xs font-medium">
                    ⏰ Waktu: <Text className="font-semibold text-slate-900">{b.bookingTime}</Text>
                  </Text>
                  {b.notes ? (
                    <Text className="text-slate-500 text-xs italic">Catatan: &quot;{b.notes}&quot;</Text>
                  ) : null}
                </View>

                <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-lg">
                  <Text className="text-slate-500 text-xs font-medium">Total Tagihan:</Text>
                  <Text className="font-extrabold text-amber-600 text-sm">
                    {formatCurrency(b.totalAmount || (b as any).totalPrice || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
