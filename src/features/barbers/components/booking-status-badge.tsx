/**
 * BookingStatusBadge Component
 * Displays booking status with color coding
 */

import React from 'react';
import { Text, View } from 'react-native';
import type { BookingStatus } from '@/types/domain';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<BookingStatus, { bg: string; text: string; label: string; icon: string }> = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Menunggu',
    icon: '⏱',
  },
  accepted: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    label: 'Diterima',
    icon: '📋',
  },
  rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    label: 'Ditolak',
    icon: '✕',
  },
  in_progress: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    label: 'Proses',
    icon: '✂️',
  },
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Selesai',
    icon: '✓',
  },
  cancelled: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: 'Dibatalkan',
    icon: '✕',
  },
};

const sizeStyles = {
  sm: 'px-2 py-1',
  md: 'px-3 py-1.5',
  lg: 'px-4 py-2',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function BookingStatusBadge({
  status,
  size = 'md',
}: BookingStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View className={`${config.bg} ${sizeStyles[size]} rounded-full flex-row items-center gap-1`}>
      <Text className={`${config.text} ${textSizes[size]}`}>{config.icon}</Text>
      <Text className={`${config.text} ${textSizes[size]} font-semibold`}>
        {config.label}
      </Text>
    </View>
  );
}
