/**
 * SettingsListItem Component
 * Displays a settings menu item
 */

import { Pressable, Text, View } from 'react-native';

interface SettingsListItemProps {
  label: string;
  icon?: string;
  onPress?: () => void;
  isActive?: boolean;
  hasToggle?: boolean;
  toggleValue?: boolean;
}

export function SettingsListItem({
  label,
  icon,
  onPress,
  isActive = false,
  hasToggle = false,
  toggleValue = false,
}: SettingsListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-slate-200 px-4 py-4">
      <View className="flex-row items-center gap-3">
        {icon && <Text className="text-xl">{icon}</Text>}

        <Text className={`text-base font-medium ${isActive ? 'text-orange-600' : 'text-slate-900'}`}>
          {label}
        </Text>
      </View>

      {hasToggle && (
        <View
          className={`h-6 w-10 rounded-full border-2 px-1 ${
            toggleValue ? 'border-orange-600 bg-orange-600' : 'border-slate-300 bg-white'
          }`}>
          <View
            className={`h-4 w-4 rounded-full bg-white transition-all ${
              toggleValue ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </View>
      )}

      {!hasToggle && <Text className="text-slate-400">›</Text>}
    </Pressable>
  );
}
