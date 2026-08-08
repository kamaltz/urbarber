import { adminRepository } from '@/features/admin/repository/admin.repository';
import type { AdminBookingRecord } from '@/features/admin/types/admin';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  rejected:    'bg-red-50 text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  accepted: 'Diterima',
  in_progress: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return `Rp ${amount}`;
}

function BookingRow({ item }: { item: AdminBookingRecord }) {
  const statusStyle = STATUS_STYLES[item.status] ?? 'bg-slate-100 text-slate-500';
  const [bg, txt] = statusStyle.split(' ');

  return (
    <TouchableOpacity
      className="bg-white rounded-xl px-4 py-3 mb-2 border border-slate-100"
      onPress={() => router.push(`/(admin)/bookings/${item.id}` as any)}
      id={`admin-booking-row-${item.id}`}
    >
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-sm font-semibold text-slate-700">#{item.id.slice(-8).toUpperCase()}</Text>
        <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
          <Text className={`text-xs font-medium ${txt}`}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>
      <Text className="text-xs text-slate-400">{item.date} · {item.startTime}</Text>
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-slate-500 flex-1" numberOfLines={1}>
          {item.paymentMethod === 'cash_on_service' ? '💵 Cash' : '💳 Online'}
        </Text>
        <Text className="text-sm font-semibold text-slate-800">{formatCurrency(item.totalPrice)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<AdminBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await adminRepository.getBookings(filter);
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminRepository.getBookings(filter)
      .then((data) => {
        if (active) setBookings(data);
      })
      .catch(() => {
        if (active) setBookings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filter]);

  const FILTERS = [
    { label: 'Semua', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Aktif', value: 'in_progress' },
    { label: 'Selesai', value: 'completed' },
    { label: 'Batal', value: 'cancelled' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-900">Monitor Booking</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{bookings.length} booking ditemukan</Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row bg-white px-4 py-2 border-b border-slate-100 gap-1.5">
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            id={`admin-booking-filter-${f.label}`}
            className={`px-3 py-1.5 rounded-lg ${filter === f.value ? 'bg-blue-600' : 'bg-slate-100'}`}
          >
            <Text className={`text-xs font-semibold ${filter === f.value ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <BookingRow item={item} />}
          contentContainerClassName="px-4 pt-3 pb-10"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-400">Tidak ada booking ditemukan.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
