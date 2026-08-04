/**
 * BookingFlagCard Component
 * Displays a booking for verification with flag action
 */

import { Pressable, Text, View } from 'react-native';
import { AppButton } from '../../ui/app-button';
import type { BookingForVerification } from '../types/admin';

interface BookingFlagCardProps {
  booking: BookingForVerification;
  onFlag?: (bookingId: string, flag: boolean) => void;
  onPress?: () => void;
}

const verificationStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Tertunda' },
  verified: { bg: 'bg-green-50', text: 'text-green-600', label: 'Diverifikasi' },
  flagged: { bg: 'bg-red-50', text: 'text-red-600', label: 'Berbendera' },
};

const paymentStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Tertunda' },
  completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Selesai' },
  failed: { bg: 'bg-red-50', text: 'text-red-600', label: 'Gagal' },
};

export function BookingFlagCard({
  booking,
  onFlag,
  onPress,
}: BookingFlagCardProps) {
  const verificationStyle = verificationStatusStyles[booking.verificationStatus];
  const paymentStyle = paymentStatusStyles[booking.paymentStatus];

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
          <Text className="text-slate-500 text-sm mb-2">
            {booking.barberName} • {booking.bookingDate} {booking.bookingTime}
          </Text>
        </View>
        <View className={`${verificationStyle.bg} px-3 py-1 rounded-full ml-2`}>
          <Text className={`${verificationStyle.text} text-xs font-semibold`}>
            {verificationStyle.label}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-900 font-semibold">
          Rp {booking.amount.toLocaleString('id-ID')}
        </Text>
        <View className={`${paymentStyle.bg} px-3 py-1 rounded-full`}>
          <Text className={`${paymentStyle.text} text-xs font-semibold`}>
            {paymentStyle.label}
          </Text>
        </View>
      </View>

      {booking.flaggedReason && (
        <View className="bg-red-50 border-l-4 border-red-600 p-3 mb-3 rounded">
          <Text className="text-red-900 text-xs font-semibold mb-1">
            ⚠️ Alasan Bendera
          </Text>
          <Text className="text-red-800 text-sm">
            {booking.flaggedReason}
          </Text>
        </View>
      )}

      {booking.verificationStatus === 'flagged' && (
        <AppButton
          title="Buka Bendera"
          size="sm"
          onPress={() => onFlag?.(booking.bookingId, false)}
        />
      )}

      {booking.verificationStatus === 'pending' && (
        <AppButton
          title="Tandai Berbendera"
          size="sm"
          variant="secondary"
          onPress={() => onFlag?.(booking.bookingId, true)}
        />
      )}
    </Pressable>
  );
}
