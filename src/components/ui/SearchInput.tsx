import React from 'react';
import { Text, View } from 'react-native';

import { AppInput, type AppInputProps } from '@/components/ui/AppInput';

export type SearchInputProps = Omit<AppInputProps, 'leftAdornment'> & {
  leftIcon?: React.ReactNode;
};

export function SearchInput({ leftIcon, placeholder = 'Search...', ...rest }: SearchInputProps) {
  return (
    <AppInput
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      leftAdornment={
        <View className="mr-2">
          {leftIcon ?? <Text className="text-base text-slate-400">⌕</Text>}
        </View>
      }
      {...rest}
    />
  );
}
