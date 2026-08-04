import React from 'react';
import { Text, View } from 'react-native';

export type BadgeProps = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
};

const toneClass = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
} as const;

const sizeClass = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
} as const;

export function Badge({ label, tone = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <View className={['self-start rounded-full', className ?? ''].join(' ')}>
      <Text className={['font-medium', toneClass[tone], sizeClass[size]].join(' ')}>{label}</Text>
    </View>
  );
}
