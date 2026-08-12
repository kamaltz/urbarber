import React from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps, type ViewStyle } from 'react-native';

type AppButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = PressableProps & {
  label?: string;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  className?: string;
  contentClassName?: string;
  textClassName?: string;
};

const variantClass: Record<AppButtonVariant, string> = {
  primary: 'bg-[#D2691E] border-[#D2691E]',
  secondary: 'bg-[#363062] border-[#363062]',
  destructive: 'bg-[#F43F5E] border-[#F43F5E]',
  ghost: 'bg-transparent border-transparent',
};

const textVariantClass: Record<AppButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  destructive: 'text-white',
  ghost: 'text-[#D2691E]',
};

const sizeClass: Record<AppButtonSize, string> = {
  sm: 'h-10 px-3',
  md: 'h-12 px-4',
  lg: 'h-14 px-5',
};

const textSizeClass: Record<AppButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function AppButton({
  label,
  children,
  loading = false,
  disabled,
  fullWidth = true,
  leftIcon,
  rightIcon,
  variant = 'primary',
  size = 'md',
  className,
  contentClassName,
  textClassName,
  style,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={[
        'items-center justify-center rounded-xl border',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      style={style as ViewStyle}
      {...rest}>
      <View
        style={{ pointerEvents: 'none' }}
        className={[
          'flex-row items-center justify-center gap-2',
          contentClassName ?? '',
        ].join(' ')}>
        {leftIcon}
        {loading ? <ActivityIndicator color={variant === 'secondary' ? '#0f172a' : '#ffffff'} /> : null}
                {typeof children === 'function'
                  ? children({ pressed: false } as any)
                  : children ?? (
              <Text
                className={[
                  'font-semibold',
                  textVariantClass[variant],
                  textSizeClass[size],
                  textClassName ?? '',
                ].join(' ')}>
                {label}
              </Text>
            )}
        {rightIcon}
      </View>
    </Pressable>
  );
}
