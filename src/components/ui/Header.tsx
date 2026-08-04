import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBackPress?: () => void;
  showBackButton?: boolean;
  className?: string;
};

export function Header({
  title,
  subtitle,
  leftAction,
  rightAction,
  onBackPress,
  showBackButton = false,
  className,
}: HeaderProps) {
  return (
    <View className={['w-full flex-row items-center justify-between py-3', className ?? ''].join(' ')}>
      <View className="w-12 items-start">
        {leftAction ??
          (showBackButton ? (
            <Pressable accessibilityRole="button" onPress={onBackPress} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Text className="text-lg text-slate-900">‹</Text>
            </Pressable>
          ) : null)}
      </View>

      <View className="flex-1 items-center px-2">
        <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View className="w-12 items-end">{rightAction}</View>
    </View>
  );
}
