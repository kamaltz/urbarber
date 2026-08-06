/**
 * Booking Card Component - Used in booking list
 */

import { Image, Pressable, Text, View } from 'react-native';
import type { BookingStatus } from '@/types/domain';
import { Booking } from '../types/booking';

export type BookingCardProps = {
  booking: Booking;
  onPress: () => void;
};

export function BookingCard({ booking, onPress }: BookingCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <View className="flex-row gap-4">
        {/* Image */}
        <Image
          source={{ uri: booking.shop.imageUrl }}
          className="h-24 w-24 rounded-lg bg-slate-200"
        />

        {/* Content */}
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{booking.shop.name}</Text>

          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-sm text-slate-600">📍 {booking.shop.location}</Text>
          </View>

          <View className="mt-2 flex-row items-center gap-1">
            <Text className="text-sm text-slate-600">⭐ {booking.shop.rating}</Text>
          </View>

          {/* Status Badge */}
          <View className="mt-2">
            <Text className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(booking.status)}`}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function getStatusLabel(status: BookingStatus | string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Konfirmasi',
    accepted: 'Diterima Barber',
    rejected: 'Ditolak Barber',
    in_progress: 'Sedang Berlangsung',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };
  return labels[status] || status;
}

function getStatusStyle(status: BookingStatus | string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800';
    case 'in_progress':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'cancelled':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}
