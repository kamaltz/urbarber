import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

export type BrandTextProps = TextProps & {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
  className?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Reusable URBarber presentation component for text branding.
 * Render text string: URBARBER
 * Default color: #363062
 * On dark background (light=true): #FFFFFF
 * Typography: extra-bold, clean, consistent with Figma hierarchy.
 */
export function BrandText({
  size = 'md',
  light = false,
  className,
  style,
  ...rest
}: BrandTextProps) {
  const sizeClasses = {
    sm: 'text-sm font-extrabold tracking-wider',
    md: 'text-xl font-extrabold tracking-wider',
    lg: 'text-2xl font-extrabold tracking-wider',
  };

  const colorClass = light ? 'text-white' : 'text-[#363062]';

  return (
    <Text
      className={[sizeClasses[size], colorClass, className ?? ''].join(' ')}
      style={style}
      accessibilityRole="text"
      accessibilityLabel="URBarber"
      {...rest}
    >
      URBARBER
    </Text>
  );
}
