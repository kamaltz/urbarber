import { adminRepository } from '@/features/admin/repository/admin.repository';
import type { AdminBarberRecord } from '@/features/admin/types/admin';
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

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
};

const LISTING_COLORS: Record<string, string> = {
  active: 'text-green-600',
  inactive: 'text-slate-400',
  suspended: 'text-red-500',
};

function BarberRow({ item }: { item: AdminBarberRecord }) {
  const statusStyle = STATUS_COLORS[item.verificationStatus] ?? 'bg-slate-100 text-slate-500';
  const listingColor = LISTING_COLORS[item.listingStatus ?? 'inactive'] ?? 'text-slate-400';

  return (
    <TouchableOpacity
      className="bg-white rounded-xl px-4 py-3 mb-2 border border-slate-100"
      onPress={() => router.push(`/(admin)/barbers/${item.id}` as any)}
      id={`admin-barber-row-${item.id}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-slate-800">{item.displayName}</Text>
          {item.businessName ? (
            <Text className="text-xs text-slate-500">{item.businessName}</Text>
          ) : null}
        </View>
        <View className={`rounded-full px-2 py-0.5 ${statusStyle.split(' ')[0]}`}>
          <Text className={`text-xs font-medium capitalize ${statusStyle.split(' ')[1]}`}>
            {item.verificationStatus}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className={`text-xs font-medium ${listingColor}`}>
          Listing: {item.listingStatus ?? 'inactive'}
        </Text>
        {typeof item.ratingAverage === 'number' && item.ratingAverage > 0 ? (
          <Text className="text-xs text-slate-500">⭐ {item.ratingAverage.toFixed(1)} ({item.reviewCount ?? 0})</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function AdminBarbersScreen() {
  const [barbers, setBarbers] = useState<AdminBarberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await adminRepository.getBarbers(filter);
      setBarbers(data);
    } catch {
      setBarbers([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    adminRepository.getBarbers(filter)
      .then((data) => {
        if (active) setBarbers(data);
      })
      .catch(() => {
        if (active) setBarbers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filter]);

  const FILTERS = [
    { label: 'Semua', value: undefined },
    { label: 'Approved', value: 'approved' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-900">Daftar Barber</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{barbers.length} barber ditemukan</Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row bg-white px-4 py-2 border-b border-slate-100 gap-2">
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            id={`admin-barber-filter-${f.label}`}
            className={`px-3 py-1.5 rounded-lg ${filter === f.value ? 'bg-blue-600' : 'bg-slate-100'}`}
          >
            <Text className={`text-xs font-semibold ${filter === f.value ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Registration Queue CTA */}
      <TouchableOpacity
        className="mx-4 mt-3 mb-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex-row justify-between items-center"
        onPress={() => router.push('/(admin)/barber-registrations' as any)}
        id="admin-barbers-reg-queue-btn"
      >
        <Text className="text-sm font-semibold text-yellow-800">📋 Antrian Verifikasi</Text>
        <Text className="text-yellow-600 text-base">›</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={barbers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <BarberRow item={item} />}
          contentContainerClassName="px-4 pt-3 pb-10"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-400">Tidak ada barber ditemukan.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
