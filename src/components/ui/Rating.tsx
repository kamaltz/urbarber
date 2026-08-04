import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type RatingProps = {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
  showValue?: boolean;
  className?: string;
};

const starSize: Record<NonNullable<RatingProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function Rating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  className,
}: RatingProps) {
  const normalized = Math.max(0, Math.min(value, max));

  return (
    <View className={['flex-row items-center gap-2', className ?? ''].join(' ')}>
      <View className="flex-row items-center gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const index = i + 1;
          const filled = index <= Math.round(normalized);
          const star = (
            <Text className={[starSize[size], filled ? 'text-amber-400' : 'text-slate-300'].join(' ')}>{'★'}</Text>
          );

          if (interactive && onChange) {
            return (
              <Pressable key={index} onPress={() => onChange(index)} accessibilityRole="button" hitSlop={8}>
                {star}
              </Pressable>
            );
          }

          return <View key={index}>{star}</View>;
        })}
      </View>

      {showValue ? <Text className="text-sm font-medium text-slate-700">{normalized.toFixed(1)}</Text> : null}
    </View>
  );
}
