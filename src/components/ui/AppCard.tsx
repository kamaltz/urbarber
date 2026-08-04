import React from 'react';
import { Pressable, Text, View, type PressableProps, type ViewProps } from 'react-native';

type CardVariant = 'default' | 'elevated' | 'outlined';

type BaseProps = {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  variant?: CardVariant;
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
};

export type AppCardProps = BaseProps &
  ({ onPress?: undefined } & ViewProps | { onPress: PressableProps['onPress'] } & Omit<PressableProps, 'onPress'>);

const variantClass: Record<CardVariant, string> = {
  default: 'border border-slate-200 bg-white',
  elevated: 'border border-slate-100 bg-white shadow-sm',
  outlined: 'border border-slate-300 bg-white',
};

export function AppCard({
  title,
  subtitle,
  footer,
  children,
  variant = 'default',
  padded = true,
  className,
  bodyClassName,
  ...rest
}: AppCardProps) {
  const classes = [
    'w-full rounded-2xl',
    variantClass[variant],
    padded ? 'p-4' : '',
    className ?? '',
  ].join(' ');

  const content = (
    <>
      {title ? <Text className="text-base font-semibold text-slate-900">{title}</Text> : null}
      {subtitle ? <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text> : null}
      <View className={['mt-3', bodyClassName ?? ''].join(' ')}>{children}</View>
      {footer ? <View className="mt-4">{footer}</View> : null}
    </>
  );

  if ('onPress' in rest && rest.onPress) {
    return (
      <Pressable className={classes} accessibilityRole="button" {...rest}>
        {content}
      </Pressable>
    );
  }

  return (
    <View className={classes} {...(rest as ViewProps)}>
      {content}
    </View>
  );
}
