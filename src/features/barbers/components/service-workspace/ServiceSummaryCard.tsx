/**
 * ServiceSummaryCard
 * Shown once the booking reaches 'completed'. Purely a readout of real
 * fields already on the booking (customer name, service name, duration
 * derived from startedAt/completedAt, completion time) -- never fabricates
 * a rating on the customer's behalf.
 */
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { router } from 'expo-router';

interface ServiceSummaryCardProps {
  customerName: string;
  serviceName: string;
  startedAt?: string;
  completedAt?: string;
}

export function ServiceSummaryCard({ customerName, serviceName, startedAt, completedAt }: ServiceSummaryCardProps) {
  const durationText =
    startedAt && completedAt
      ? (() => {
          const seconds = Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000));
          const minutes = Math.round(seconds / 60);
          return `${minutes} menit`;
        })()
      : null;

  const completedTimeText = completedAt
    ? new Date(completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 items-center">
      <Text className="text-2xl mb-1">✅</Text>
      <Text className="text-base font-extrabold text-emerald-800 mb-3">Pelayanan Selesai</Text>

      <View className="w-full gap-2">
        <View className="flex-row justify-between">
          <Text className="text-xs text-emerald-700">Pelanggan</Text>
          <Text className="text-xs font-bold text-emerald-900">{customerName}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-emerald-700">Layanan</Text>
          <Text className="text-xs font-bold text-emerald-900">{serviceName}</Text>
        </View>
        {durationText ? (
          <View className="flex-row justify-between">
            <Text className="text-xs text-emerald-700">Durasi</Text>
            <Text className="text-xs font-bold text-emerald-900">{durationText}</Text>
          </View>
        ) : null}
        {completedTimeText ? (
          <View className="flex-row justify-between">
            <Text className="text-xs text-emerald-700">Selesai</Text>
            <Text className="text-xs font-bold text-emerald-900">{completedTimeText}</Text>
          </View>
        ) : null}
      </View>

      <View className="w-full flex-row gap-2 mt-4">
        <AppButton
          label="Kembali ke Dashboard"
          onPress={() => router.replace('/(barber)/home')}
          variant="secondary"
          className="flex-1"
        />
        <AppButton
          label="Lihat Riwayat"
          onPress={() => router.push('/(barber)/(tabs)/bookings' as any)}
          variant="primary"
          className="flex-1"
        />
      </View>
    </View>
  );
}
