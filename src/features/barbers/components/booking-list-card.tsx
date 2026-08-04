/**
 * BookingListCard Component
 * Displays a single booking in list format with status
 */

import React from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { classNameToString } from 'nativewind';
import { AppButton } from '../../ui/app-button';
import type { BarberBooking } from '../types/barber';

interface BookingListCardProps {
  booking: BarberBooking;
  onPress?: () => void;
  onStatusChange?: (status: string) => void;
  actionLabel?: string;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  waiting: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Menunggu' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Proses' },
  completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Selesai' },
  cancelled: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Dibatalkan' },
};

export function BookingListCard({
  booking,
  onPress,
  onStatusChange,
  actionLabel = 'Detail',
}: BookingListCardProps) {
  const statusStyle = statusStyles[booking.status] || statusStyles.waiting;
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

      {onStatusChange && booking.status === 'waiting' && (
        <AppButton
          title="Terima Pesanan"
          size="sm"
          onPress={() => onStatusChange('processing')}
          className="bg-orange-600"
        />
      )}

      {actionLabel && onPress && (
        <AppButton
          title={actionLabel}
          size="sm"
          variant="secondary"
          onPress={onPress}
        />
      )}
    </Pressable>
  );
}
