/**
 * CustomerSearchBar Component
 * Reusable search bar for barber/service search
 */

import { Pressable, Text, TextInput, View } from 'react-native';

interface CustomerSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export function CustomerSearchBar({
  placeholder = 'Cari barbershop...',
  value,
  onChangeText,
  onFilterPress,
  showFilter = true,
}: CustomerSearchBarProps) {
  return (
    <View className="flex-row items-center gap-2 px-4">
      <View className="flex-1 flex-row items-center rounded-lg bg-slate-100 px-3 py-2">
        <Text className="text-lg text-slate-400">🔍</Text>

        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#9CA3AF"
          className="ml-2 flex-1 text-base text-slate-900"
          returnKeyType="search"
        />
      </View>

      {showFilter && (
        <Pressable
          onPress={onFilterPress}
          className="h-10 w-10 items-center justify-center rounded-lg bg-white">
          <Text className="text-lg">⚙️</Text>
        </Pressable>
      )}
    </View>
  );
}
