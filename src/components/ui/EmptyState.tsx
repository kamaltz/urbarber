import React from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onActionPress,
  className,
}: EmptyStateProps) {
  return (
    <View className={['w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6', className ?? ''].join(' ')}>
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-center text-base font-semibold text-slate-900">{title}</Text>
      {description ? <Text className="mt-2 text-center text-sm text-slate-500">{description}</Text> : null}
      {actionLabel && onActionPress ? (
        <AppButton
          label={actionLabel}
          onPress={onActionPress}
          variant="ghost"
          fullWidth={false}
          className="mt-4"
        />
      ) : null}
    </View>
  );
}
