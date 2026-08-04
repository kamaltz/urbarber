/**
 * BookingSummaryStrip Component
 * Displays total, completed, and pending booking counts
 */

import React from 'react';
import { Text, View } from 'react-native';
import type { BarberBookingStatusSummary } from '../types/barber';

interface BookingSummaryStripProps {
  summary: BarberBookingStatusSummary;
}

interface SummaryItem {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

export function BookingSummaryStrip({ summary }: BookingSummaryStripProps) {
  const items: SummaryItem[] = [
    {
      label: 'Total',
      value: summary.total,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      label: 'Selesai',
      value: summary.completed,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Menunggu',
      value: summary.pending,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <View className="flex-row gap-3 mb-4">
      {items.map((item) => (
        <View
          key={item.label}
          className={`${item.bgColor} flex-1 rounded-lg p-3 items-center`}
        >
          <Text className={`${item.color} text-2xl font-bold mb-1`}>
            {item.value}
          </Text>
          <Text className={`${item.color} text-xs font-medium`}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
