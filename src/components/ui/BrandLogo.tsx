import { Image } from 'expo-image';
import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface BrandLogoProps extends ViewProps {
  variant?: 'default' | 'compact' | 'light' | 'large';
  showLabel?: boolean;
  className?: string;
}

const logoFull = require('@/assets/images/urbarber-logo.png');
const logoIcon = require('@/assets/images/urbarber-icon.png');

/**
 * Canonical URBarber Brand Logo Component.
 * Encapsulates the official visual identity assets across Auth, Onboarding, and Header states.
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
      <View className={['items-center justify-center', className ?? ''].join(' ')} style={style} {...rest}>
        <Image
          source={logoFull}
          contentFit="contain"
          style={{ width: 220, height: 80 }}
          accessibilityLabel="URBarber Logo"
        />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        className={['items-center justify-center rounded-xl bg-[#363062] p-1 shadow-xs', className ?? ''].join(' ')}
        style={style}
        {...rest}
      >
        <Image
          source={logoIcon}
          contentFit="contain"
          style={{ width: 32, height: 32 }}
          accessibilityLabel="URBarber Icon"
        />
      </View>
    );
  }

  if (variant === 'light') {
    return (
      <View className={['flex-row items-center justify-center', className ?? ''].join(' ')} style={style} {...rest}>
        <Image
          source={logoFull}
          contentFit="contain"
          style={{ width: 150, height: 48 }}
          accessibilityLabel="URBarber Logo Light"
        />
      </View>
    );
  }

  return (
    <View className={['flex-row items-center justify-center', className ?? ''].join(' ')} style={style} {...rest}>
      <Image
        source={logoFull}
        contentFit="contain"
        style={{ width: 160, height: 52 }}
        accessibilityLabel="URBarber Logo"
      />
    </View>
  );
}
