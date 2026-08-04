import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export type LoadingProps = {
  label?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
};

export function Loading({ label = 'Loading...', fullScreen = false, overlay = false, className }: LoadingProps) {
  return (
    <View
      className={[
        fullScreen ? 'flex-1' : 'min-h-24',
        'items-center justify-center',
        overlay ? 'absolute inset-0 z-50 bg-white/70' : '',
        className ?? '',
      ].join(' ')}>
      <ActivityIndicator size="large" color="#D2691E" />
      {label ? <Text className="mt-3 text-sm text-slate-600">{label}</Text> : null}
    </View>
  );
}
