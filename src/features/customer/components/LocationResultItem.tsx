/**
 * LocationResultItem Component
 * Displays a location search result
 */

import { Pressable, Text, View } from 'react-native';
import type { Location } from '../types/customer';

interface LocationResultItemProps {
  location: Location;
  onPress?: () => void;
  isSelected?: boolean;
}

export function LocationResultItem({
  location,
  onPress,
  isSelected = false,
}: LocationResultItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between border-b border-slate-100 px-4 py-3 ${
        isSelected ? 'bg-orange-50' : 'bg-white'
      }`}>
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-slate-900">{location.locationName}</Text>

        <Text className="text-sm text-slate-600">{location.locationAddress}</Text>

        {location.distance && <Text className="text-xs text-slate-500">{location.distance}</Text>}
      </View>

      {isSelected && <Text className="text-xl text-orange-600">✓</Text>}

      <Text className="ml-2 text-slate-400">›</Text>
    </Pressable>
  );
}
