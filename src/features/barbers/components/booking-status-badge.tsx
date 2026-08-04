/**
 * BookingStatusBadge Component
 * Displays booking status with color coding
 */

import React from 'react';
import { Text, View } from 'react-native';

interface BookingStatusBadgeProps {
  status: 'waiting' | 'processing' | 'completed' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  waiting: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    label: 'Menunggu',
    icon: '⏱',
  },
  processing: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    label: 'Proses',
    icon: '⚙️',
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    label: 'Selesai',
    icon: '✓',
  },
  cancelled: {
    bg: 'bg-slate-50',
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
  const config = statusConfig[status];

  return (
    <View className={`${config.bg} ${sizeStyles[size]} rounded-full flex-row items-center gap-1`}>
      <Text className={`${config.text} ${textSizes[size]}`}>{config.icon}</Text>
      <Text className={`${config.text} ${textSizes[size]} font-semibold`}>
        {config.label}
      </Text>
    </View>
  );
}
