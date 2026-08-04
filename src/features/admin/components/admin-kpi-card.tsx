/**
 * AdminKpiCard Component
 * Displays admin dashboard KPI metrics
 */

import { Text, View } from 'react-native';
import type { AdminDashboardMetrics } from '../types/admin';

interface KpiItem {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface AdminKpiCardProps {
  metrics: AdminDashboardMetrics;
  variant?: 'full' | 'compact';
}

const colorMap: Record<string, { bg: string; text: string }> = {
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

export function AdminKpiCard({
  metrics,
  variant = 'full',
}: AdminKpiCardProps) {
  const items: KpiItem[] = [
    {
      label: 'Total Pengguna',
      value: metrics.totalUsers,
      icon: '👥',
      color: 'blue',
    },
    {
      label: 'Pesanan',
      value: metrics.totalBookings,
      icon: '📅',
      color: 'orange',
    },
    {
      label: 'Pendapatan',
      value: `Rp ${(metrics.totalRevenue / 1000000).toFixed(1)}M`,
      icon: '💰',
      color: 'green',
    },
    {
      label: 'Rating Rata-rata',
      value: metrics.averageRating.toFixed(1),
      icon: '⭐',
      color: 'purple',
    },
    {
      label: 'Tiket Terbuka',
      value: metrics.ticketsOpen,
      icon: '🎫',
      color: 'red',
    },
    {
      label: 'Review Tertunda',
      value: metrics.reviewsPending,
      icon: '📝',
      color: 'orange',
    },
  ];

  const displayItems = variant === 'compact' ? items.slice(0, 4) : items;

  return (
    <View className="mb-4">
      <View className="flex-row flex-wrap gap-3">
        {displayItems.map((item, index) => {
          const colorStyle = colorMap[item.color];
          return (
            <View
              key={index}
              className={`${colorStyle.bg} rounded-lg p-3 flex-1`}
              style={{ minWidth: '30%' }}
            >
              <Text className="text-2xl mb-1">{item.icon}</Text>
              <Text className={`${colorStyle.text} text-sm font-bold mb-0.5`}>
                {item.value}
              </Text>
              <Text className={`${colorStyle.text} text-xs`}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * SystemStatusCard Component
 * Displays system health status
 */
interface SystemStatusCardProps {
  apiStatus: 'healthy' | 'degraded' | 'down';
  databaseStatus: 'healthy' | 'degraded' | 'down';
  storageUsage: number;
  errorRate: number;
}

const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  healthy: { bg: 'bg-green-50', text: 'text-green-600', icon: '✓' },
  degraded: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: '⚠️' },
  down: { bg: 'bg-red-50', text: 'text-red-600', icon: '✕' },
};

export function SystemStatusCard({
  apiStatus,
  databaseStatus,
  storageUsage,
  errorRate,
}: SystemStatusCardProps) {
  return (
    <View className="bg-white border border-slate-100 rounded-lg p-4 mb-4">
      <Text className="text-slate-900 font-semibold text-base mb-4">
        Kesehatan Sistem
      </Text>

      <View className="gap-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-700">API</Text>
          <View className={`${statusColors[apiStatus].bg} px-3 py-1 rounded`}>
            <Text className={`${statusColors[apiStatus].text} font-semibold text-sm`}>
              {statusColors[apiStatus].icon} {apiStatus === 'healthy' ? 'Sehat' : apiStatus === 'degraded' ? 'Terganggu' : 'Tidak Aktif'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-slate-700">Database</Text>
          <View className={`${statusColors[databaseStatus].bg} px-3 py-1 rounded`}>
            <Text className={`${statusColors[databaseStatus].text} font-semibold text-sm`}>
              {statusColors[databaseStatus].icon} {databaseStatus === 'healthy' ? 'Sehat' : databaseStatus === 'degraded' ? 'Terganggu' : 'Tidak Aktif'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-slate-700">Penyimpanan</Text>
          <Text className="text-slate-900 font-semibold">
            {storageUsage}%
          </Text>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-slate-700">Tingkat Kesalahan</Text>
          <Text className="text-slate-900 font-semibold">
            {errorRate}%
          </Text>
        </View>
      </View>
    </View>
  );
}
