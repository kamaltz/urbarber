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
      className="mb-3.5 rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 active:bg-slate-50">
      <View className="flex-row gap-3.5">
        {/* Image */}
        <Image
          source={{ uri: booking.shop.imageUrl }}
          className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200/60"
        />

        {/* Content */}
        <View className="flex-1 justify-between py-0.5">
          <View>
            <Text className="text-base font-bold text-[#363062]">{booking.shop.name}</Text>

            <View className="mt-1 flex-row items-center gap-1.5">
              <Text className="text-xs text-slate-500 font-medium">📍 {booking.shop.location}</Text>
            </View>

            <View className="mt-1 flex-row items-center gap-1">
              <Text className="text-xs font-bold text-[#363062]">⭐ {booking.shop.rating}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View className="mt-2.5 flex-row items-center justify-between">
            <View className={`rounded-full px-3 py-1 border ${getStatusStyle(booking.status)}`}>
              <Text className="text-[11px] font-bold">
                {getStatusLabel(booking.status)}
              </Text>
            </View>

            <Text className="text-xs font-bold text-[#D2691E]">Detail ›</Text>
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
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'accepted':
      return 'bg-[#EDEFFB] text-[#363062] border-[#363062]/20';
    case 'rejected':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'in_progress':
      return 'bg-orange-50 text-[#D2691E] border-orange-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
