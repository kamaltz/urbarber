import { fetchBarberRegistrations } from '@/features/admin/services/admin.service';
import type { AdminBarberRegistration } from '@/features/admin/types/admin';
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

function formatDate(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts.seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  draft:    'bg-slate-100 text-slate-500',
};

function RegistrationRow({ item }: { item: AdminBarberRegistration }) {
  const [bg, txt] = (STATUS_STYLE[item.verificationStatus] ?? 'bg-slate-100 text-slate-500').split(' ');
  return (
    <TouchableOpacity
      className="bg-white rounded-xl px-4 py-4 mb-2 border border-slate-100"
      onPress={() => router.push(`/(admin)/barber-registrations/${item.barberId}` as any)}
      id={`admin-reg-row-${item.barberId}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-slate-800 text-base">{item.ownerName}</Text>
          <Text className="text-sm text-slate-500">{item.businessName}</Text>
          {item.businessAddress ? (
            <Text className="text-xs text-slate-400 mt-0.5">{item.businessAddress}</Text>
          ) : null}
        </View>
        <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
          <Text className={`text-xs font-semibold capitalize ${txt}`}>{item.verificationStatus}</Text>
        </View>
      </View>
      <View className="flex-row justify-between mt-2">
        <Text className="text-xs text-slate-400">Dikirim: {formatDate(item.submittedAt)}</Text>
        {item.reviewedAt ? (
          <Text className="text-xs text-slate-400">Review: {formatDate(item.reviewedAt)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function BarberRegistrationsScreen() {
  const [registrations, setRegistrations] = useState<AdminBarberRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>('pending');
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchBarberRegistrations(filter);
      setRegistrations(data);
    } catch (err: any) {
      setError(err?.message ?? 'Gagal memuat data.');
      setRegistrations([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchBarberRegistrations(filter)
      .then((data) => {
        if (active) setRegistrations(data);
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message ?? 'Gagal memuat data.');
          setRegistrations([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filter]);

  const FILTERS: { label: string; value: 'pending' | 'approved' | 'rejected' | undefined }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Semua', value: undefined },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" id="admin-reg-back-btn">
          <Text className="text-blue-600 text-base">‹</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-bold text-slate-900">Verifikasi Barber</Text>
          <Text className="text-xs text-slate-500">{registrations.length} ditemukan</Text>
        </View>
      </View>

      {/* Filter */}
      <View className="flex-row bg-white px-4 py-2 border-b border-slate-100 gap-2">
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setFilter(f.value)}
            id={`admin-reg-filter-${f.label}`}
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
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-blue-600 rounded-xl px-6 py-3 mt-4"
            id="admin-reg-retry-btn"
          >
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={registrations}
          keyExtractor={item => item.barberId}
          renderItem={({ item }) => <RegistrationRow item={item} />}
          contentContainerClassName="px-4 pt-3 pb-10"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-slate-400 text-base">Tidak ada registrasi ditemukan.</Text>
              {filter === 'pending' && (
                <Text className="text-slate-400 text-sm mt-1">Semua antrian sudah diproses ✓</Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
