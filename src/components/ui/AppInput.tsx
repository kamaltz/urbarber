import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export type AppInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
};

export function AppInput({
  label,
  helperText,
  errorText,
  leftAdornment,
  rightAdornment,
  containerClassName,
  inputClassName,
  labelClassName,
  helperClassName,
  errorClassName,
  editable = true,
  style,
  ...rest
}: AppInputProps) {
  const hasError = Boolean(errorText);

  return (
    <View className={['w-full gap-2', containerClassName ?? ''].join(' ')}>
      {label ? <Text className={['text-sm font-semibold text-[#111827]', labelClassName ?? ''].join(' ')}>{label}</Text> : null}

      <View
        className={[
          'min-h-12 w-full flex-row items-center rounded-xl border bg-white px-3.5',
          hasError ? 'border-[#F43F5E]' : 'border-slate-200',
          !editable ? 'bg-slate-50' : '',
        ].join(' ')}>
        {leftAdornment}
        <TextInput
          editable={editable}
          placeholderTextColor="#94a3b8"
          className={[
            'flex-1 py-3 text-base text-slate-900',
            inputClassName ?? '',
          ].join(' ')}
          style={style as any}
          {...rest}
        />
        {rightAdornment}
      </View>

      {hasError ? (
        <Text className={['text-xs text-rose-600', errorClassName ?? ''].join(' ')}>{errorText}</Text>
      ) : helperText ? (
        <Text className={['text-xs text-slate-500', helperClassName ?? ''].join(' ')}>{helperText}</Text>
      ) : null}
    </View>
  );
}
