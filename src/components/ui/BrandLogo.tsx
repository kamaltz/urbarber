import React from 'react';
import { Text, View, type ViewProps } from 'react-native';

export interface BrandLogoProps extends ViewProps {
  variant?: 'default' | 'compact' | 'light' | 'large';
  showLabel?: boolean;
  className?: string;
}

/**
 * Canonical URBarber Brand Logo Component.
 * Encapsulates the visual identity badge across Auth, Onboarding, and Header states.
 */
export function BrandLogo({
  variant = 'default',
  showLabel = true,
  className,
  style,
  ...rest
}: BrandLogoProps) {
  if (variant === 'large') {
    return (
      <View className={['items-center gap-3', className ?? ''].join(' ')} style={style} {...rest}>
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-[#363062] shadow-md">
          <Text className="text-3xl text-[#D2691E]">✂</Text>
        </View>
        {showLabel ? (
          <View className="rounded-full bg-[#EDEFFB] px-4 py-1.5 border border-[#363062]/10">
            <Text className="text-sm font-extrabold tracking-widest text-[#363062]">
              URBARBER
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        className={['h-10 w-10 items-center justify-center rounded-xl bg-[#363062] shadow-xs', className ?? ''].join(' ')}
        style={style}
        {...rest}
      >
        <Text className="text-lg text-[#D2691E]">✂</Text>
      </View>
    );
  }

  if (variant === 'light') {
    return (
      <View className={['flex-row items-center gap-3', className ?? ''].join(' ')} style={style} {...rest}>
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md">
          <Text className="text-xl text-[#F99417]">✂</Text>
        </View>
        {showLabel ? (
          <View className="rounded-full bg-white/20 px-3 py-1 border border-white/30">
            <Text className="text-xs font-bold tracking-wider text-white">
              URBARBER
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className={['flex-row items-center gap-3', className ?? ''].join(' ')} style={style} {...rest}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#363062] shadow-sm">
        <Text className="text-xl text-[#D2691E]">✂</Text>
      </View>
      {showLabel ? (
        <View className="rounded-full bg-[#EDEFFB] px-3 py-1 border border-[#363062]/10">
          <Text className="text-xs font-bold tracking-wider text-[#363062]">
            URBARBER
          </Text>
        </View>
      ) : null}
    </View>
  );
}
