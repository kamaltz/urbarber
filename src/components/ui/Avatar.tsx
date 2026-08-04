import React from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  source?: ImageSourcePropType;
  name?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'busy' | 'none';
  className?: string;
};

const sizeClass: Record<AvatarSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

const textSizeClass: Record<AvatarSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-2xl',
};

const statusClass: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  busy: 'bg-rose-500',
  none: 'bg-transparent',
};

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  return initials || '?';
}

export function Avatar({ source, name, size = 'md', status = 'none', className }: AvatarProps) {
  return (
    <View className={['relative', className ?? ''].join(' ')}>
      <View className={['overflow-hidden rounded-full bg-slate-200', sizeClass[size]].join(' ')}>
        {source ? (
          <Image source={source} resizeMode="cover" className="h-full w-full" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className={['font-semibold text-slate-700', textSizeClass[size]].join(' ')}>{getInitials(name)}</Text>
          </View>
        )}
      </View>

      {status !== 'none' ? (
        <View className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white p-[5px]">
          <View className={['h-2.5 w-2.5 rounded-full', statusClass[status]].join(' ')} />
        </View>
      ) : null}
    </View>
  );
}
