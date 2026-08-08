import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchDashboardMetrics } from '@/features/admin/services/admin.service';
import type { DashboardMetrics } from '@/features/admin/types/admin';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

function MetricCard({
  label,
  value,
  color = 'text-slate-900',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 mx-1 shadow-sm border border-slate-100">
      <Text className="text-xs text-slate-500 mb-1">{label}</Text>
      <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
    </View>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return `Rp ${amount}`;
}

function formatDate(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-600',
  approved: 'text-green-600',
  rejected: 'text-red-500',
  completed: 'text-green-600',
  cancelled: 'text-red-500',
  accepted: 'text-blue-600',
  in_progress: 'text-purple-600',
};

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message ?? 'Gagal memuat dashboard.');
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  useEffect(() => {
    let active = true;
    fetchDashboardMetrics()
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch((err: any) => {
        if (active) setError(err?.message ?? 'Gagal memuat dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-slate-500">Platform Admin</Text>
            <Text className="text-lg font-bold text-slate-900">
              {user?.displayName ?? user?.email ?? 'Admin'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="bg-slate-100 px-3 py-1.5 rounded-lg"
            id="admin-logout-btn"
          >
            <Text className="text-sm text-slate-600 font-medium">Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-slate-500 mt-3">Memuat dashboard…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center font-medium">{error}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-blue-600 rounded-xl px-6 py-3 mt-4"
            id="admin-dashboard-retry-btn"
          >
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View className="px-4 pt-5">
            <Text className="text-base font-semibold text-slate-700 mb-3">Ringkasan Platform</Text>

            {/* Row 1 */}
            <View className="flex-row mb-3">
              <MetricCard label="Pelanggan Aktif" value={metrics?.activeCustomers ?? 0} />
              <MetricCard label="Barber Aktif" value={metrics?.activeBarbers ?? 0} color="text-blue-700" />
            </View>

            {/* Row 2 */}
            <View className="flex-row mb-3">
              <MetricCard label="Pending Verifikasi" value={metrics?.pendingRegistrations ?? 0} color="text-yellow-600" />
              <MetricCard label="Akun Ditangguhkan" value={metrics?.suspendedAccounts ?? 0} color="text-red-500" />
            </View>

            {/* Row 3 */}
            <View className="flex-row mb-3">
              <MetricCard label="Booking Aktif" value={metrics?.activeBookings ?? 0} color="text-purple-600" />
              <MetricCard label="Selesai" value={metrics?.completedBookings ?? 0} color="text-green-600" />
            </View>

            {/* Monthly Value */}
            <View className="bg-blue-600 rounded-2xl p-5 mb-5 shadow-sm">
              <Text className="text-xs text-blue-200 mb-1">Nilai Transaksi Layanan Bulan Ini</Text>
              <Text className="text-3xl font-bold text-white">
                {formatCurrency(metrics?.monthlyTransactionValue ?? 0)}
              </Text>
              <Text className="text-xs text-blue-200 mt-1">
                * Bukan pendapatan bersih perusahaan
              </Text>
            </View>

            {/* Registration Queue CTA */}
            {(metrics?.pendingRegistrations ?? 0) > 0 && (
              <TouchableOpacity
                className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 flex-row items-center justify-between"
                onPress={() => router.push('/(admin)/barber-registrations' as any)}
                id="admin-pending-reg-cta"
              >
                <View>
                  <Text className="font-semibold text-yellow-800">Antrian Verifikasi Barber</Text>
                  <Text className="text-sm text-yellow-600">
                    {metrics?.pendingRegistrations} pendaftaran menunggu tinjauan
                  </Text>
                </View>
                <Text className="text-yellow-600 text-lg">›</Text>
              </TouchableOpacity>
            )}

            {/* Recent Registrations */}
            {(metrics?.recentRegistrations?.length ?? 0) > 0 && (
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-slate-700">Registrasi Terbaru</Text>
                  <TouchableOpacity onPress={() => router.push('/(admin)/barber-registrations' as any)} id="admin-see-all-reg">
                    <Text className="text-sm text-blue-600">Lihat Semua</Text>
                  </TouchableOpacity>
                </View>
                {metrics?.recentRegistrations.map(reg => (
                  <TouchableOpacity
                    key={reg.barberId}
                    className="bg-white rounded-xl p-4 mb-2 border border-slate-100"
                    onPress={() => router.push(`/(admin)/barber-registrations/${reg.barberId}` as any)}
                    id={`admin-reg-item-${reg.barberId}`}
                  >
                    <Text className="font-semibold text-slate-800">{reg.ownerName}</Text>
                    <Text className="text-sm text-slate-500">{reg.businessName}</Text>
                    <View className="flex-row justify-between mt-1">
                      <Text className={`text-xs font-medium capitalize ${STATUS_COLORS[reg.verificationStatus] ?? 'text-slate-500'}`}>
                        {reg.verificationStatus}
                      </Text>
                      <Text className="text-xs text-slate-400">{formatDate(reg.submittedAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Bookings */}
            {(metrics?.recentBookings?.length ?? 0) > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-slate-700">Booking Terbaru</Text>
                  <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/bookings')} id="admin-see-all-bookings">
                    <Text className="text-sm text-blue-600">Lihat Semua</Text>
                  </TouchableOpacity>
                </View>
                {metrics?.recentBookings.map(booking => (
                  <TouchableOpacity
                    key={booking.id}
                    className="bg-white rounded-xl p-4 mb-2 border border-slate-100"
                    onPress={() => router.push(`/(admin)/bookings/${booking.id}` as any)}
                    id={`admin-booking-item-${booking.id}`}
                  >
                    <View className="flex-row justify-between">
                      <Text className="font-medium text-slate-800 text-sm">#{booking.id.slice(-8)}</Text>
                      <Text className={`text-xs font-medium capitalize ${STATUS_COLORS[booking.status] ?? 'text-slate-500'}`}>
                        {booking.status}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-sm text-slate-500">{booking.date}</Text>
                      <Text className="text-sm font-semibold text-slate-700">{formatCurrency(booking.totalPrice)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
