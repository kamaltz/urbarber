/**
 * Booking Card Component - Used in booking list
 */

import { Image, Pressable, Text, View } from 'react-native';
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
            <Text className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    booked: 'Terkonfirmasi',
    waiting: 'Menunggu',
    on_process: 'Berlangsung',
    finished: 'Selesai',
    cancelled: 'Dibatalkan',
  };
  return labels[status] || status;
}
