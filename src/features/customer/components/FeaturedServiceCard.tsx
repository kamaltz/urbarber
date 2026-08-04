/**
 * FeaturedServiceCard Component
 * Displays featured service information
 */

import { Image, Pressable, Text, View } from 'react-native';
import type { FeaturedService } from '../types/customer';

interface FeaturedServiceCardProps {
  service: FeaturedService;
  onPress?: () => void;
}

export function FeaturedServiceCard({ service, onPress }: FeaturedServiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-xl bg-white shadow-sm"
      style={{ width: 160 }}>
      {service.imageUrl && (
        <Image
          source={{ uri: service.imageUrl }}
          className="h-32 w-full bg-slate-200"
          resizeMode="cover"
        />
      )}

      <View className="gap-2 p-3">
        <Text className="font-bold text-slate-900" numberOfLines={2}>
          {service.title}
        </Text>

        <Text className="text-xs text-slate-600" numberOfLines={2}>
          {service.subtitle}
        </Text>

        {service.description && (
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {service.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
