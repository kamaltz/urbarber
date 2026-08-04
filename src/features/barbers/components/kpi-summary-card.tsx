/**
 * KpiSummaryCard Component
 * Displays KPI metrics (orders, revenue, etc.)
 */

import React from 'react';
import { Text, View } from 'react-native';

interface KpiItem {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

interface KpiSummaryCardProps {
  items: KpiItem[];
  variant?: 'single' | 'double' | 'triple';
}

const colorMap: Record<string, { bg: string; text: string }> = {
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

export function KpiSummaryCard({ items, variant = 'double' }: KpiSummaryCardProps) {
  const gridCols = variant === 'single' ? 1 : variant === 'double' ? 2 : 3;
  const flexBasis = `${100 / gridCols}%`;

  return (
    <View className="flex-row flex-wrap gap-3 mb-4">
      {items.map((item, index) => {
        const colorStyle = colorMap[item.color || 'orange'];
        return (
          <View
            key={index}
            style={{ width: `calc(${flexBasis} - ${4}px)` }}
            className={`${colorStyle.bg} rounded-lg p-4 items-center`}
          >
            {item.icon && (
              <Text className="text-2xl mb-2">{item.icon}</Text>
            )}
            <Text className={`${colorStyle.text} text-xl font-bold mb-1`}>
              {item.value}
            </Text>
            <Text className={`${colorStyle.text} text-xs font-medium text-center`}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
