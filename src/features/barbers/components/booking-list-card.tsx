/**
 * BookingListCard Component
 * Displays a single booking in list format with status
 */

import { AppButton } from '@/components/ui/AppButton';
import type { BookingStatus } from '@/types/domain';
import { Pressable, Text, View } from 'react-native';
import type { BarberBooking } from '../types/barber';

interface BookingListCardProps {
  booking: BarberBooking;
  onPress?: () => void;
  onStatusChange?: (status: BookingStatus) => void;
  actionLabel?: string;
}

const statusStyles: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Menunggu' },
  accepted: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Diterima' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Ditolak' },
  in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Proses' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Selesai' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Dibatalkan' },
};

export function BookingListCard({
  booking,
  onPress,
  onStatusChange,
  actionLabel = 'Detail',
}: BookingListCardProps) {
  const statusStyle = statusStyles[booking.status] || statusStyles.pending;
  const bookingTime = booking.bookingTime; // HH:MM
  const serviceNames = booking.services.map((s) => s.name).join(', ');

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-base mb-1">
            {booking.customerName}
          </Text>
          <Text className="text-slate-500 text-sm">{serviceNames}</Text>
        </View>
        <View className={`${statusStyle.bg} px-3 py-1 rounded-full`}>
          <Text className={`${statusStyle.text} text-xs font-semibold`}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-600 text-sm">
          {booking.bookingDate} • {bookingTime}
        </Text>
        <Text className="text-slate-900 font-semibold text-base">
          Rp {booking.totalAmount.toLocaleString('id-ID')}
        </Text>
      </View>

      {onStatusChange && booking.status === 'pending' && (
        <AppButton
          label="Terima Pesanan"
          size="sm"
          onPress={() => onStatusChange('accepted')}
          className="bg-orange-600"
        />
      )}

      {actionLabel && onPress && (
        <AppButton
          label={actionLabel}
          size="sm"
          variant="secondary"
          onPress={onPress}
        />
      )}
    </Pressable>
  );
}
