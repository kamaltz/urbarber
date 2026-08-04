/**
 * StarRatingDisplay Component
 * Displays read-only star rating
 */

import React from 'react';
import { Text, View } from 'react-native';

interface StarRatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  reviewCount?: number;
  showLabel?: boolean;
}

const sizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function StarRatingDisplay({
  rating,
  size = 'md',
  reviewCount,
  showLabel = true,
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} className={`${sizes[size]} text-yellow-400`}>
            ★
          </Text>
        ))}
        {hasHalfStar && (
          <Text className={`${sizes[size]} text-yellow-400`}>
            ⭐
          </Text>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} className={`${sizes[size]} text-slate-300`}>
            ★
          </Text>
        ))}
      </View>

      {showLabel && (
        <View className="flex-row gap-1 items-center">
          <Text className="text-slate-900 font-semibold">
            {rating.toFixed(1)}
          </Text>
          {reviewCount !== undefined && (
            <Text className="text-slate-500 text-sm">
              ({reviewCount})
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * SimpleBarChart Component
 * Basic horizontal bar chart for analytics
 */
interface ChartDataItem {
  label: string;
  value: number;
  maxValue?: number;
}

interface SimpleBarChartProps {
  data: ChartDataItem[];
  height?: number;
  showValues?: boolean;
}

export function SimpleBarChart({
  data,
  height = 200,
  showValues = true,
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), ...data.map((d) => d.maxValue || 0));

  return (
    <View style={{ height }} className="bg-white rounded-lg p-4 mb-4">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <View key={index} className="mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-700 text-sm font-medium">
                {item.label}
              </Text>
              {showValues && (
                <Text className="text-orange-600 font-semibold">
                  Rp {item.value.toLocaleString('id-ID')}
                </Text>
              )}
            </View>
            <View className="bg-slate-100 rounded-full h-2 overflow-hidden">
              <View
                className="bg-orange-600 h-full rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
