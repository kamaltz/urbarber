/**
 * BarberCard Component
 * Displays barber information in a card format
 */

import { Image, Pressable, Text, View } from 'react-native';
import type { BarberSuggestion, NearbyBarber } from '../types/customer';

interface BarberCardProps {
  barber: BarberSuggestion | NearbyBarber;
  onPress?: () => void;
  showStatus?: boolean;
  variant?: 'default' | 'compact';
}

export function BarberCard({
  barber,
  onPress,
  showStatus = true,
  variant = 'default',
}: BarberCardProps) {
  const isNearby = 'serviceType' in barber;
  const displayName = barber.name;
  const displayRating = barber.rating || 4.5;
  const displayImage = barber.imageUrl;
  const displayLocation = 'location' in barber ? barber.location : barber.location || '';

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={onPress}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <View className="flex-row gap-3 p-3">
          {displayImage && (
            <Image
              source={{ uri: displayImage }}
              className="h-12 w-12 rounded-lg"
              resizeMode="cover"
            />
          )}

          <View className="flex-1 justify-center gap-1">
            <Text className="font-semibold text-slate-900">{displayName}</Text>

            {displayLocation && <Text className="text-xs text-slate-600">{displayLocation}</Text>}

            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-medium text-slate-900">⭐ {displayRating}</Text>
              <Text className="text-xs text-slate-500">{barber.distance}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-xl bg-white shadow-sm">
      {displayImage && (
        <Image
          source={{ uri: displayImage }}
          className="h-40 w-full bg-slate-200"
          resizeMode="cover"
        />
      )}

      <View className="gap-2 p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">{displayName}</Text>

            {showStatus && 'status' in barber && (
              <Text className="mt-1 text-xs font-medium text-green-600">● {barber.status}</Text>
            )}

            {isNearby && 'serviceType' in barber && (
              <Text className="mt-1 text-sm text-slate-600">{barber.serviceType}</Text>
            )}
          </View>
        </View>

        {displayLocation && (
          <Text className="text-sm text-slate-600">📍 {displayLocation}</Text>
        )}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Text className="font-semibold text-slate-900">⭐ {displayRating}</Text>

                        {'reviewCount' in barber && barber.reviewCount ? (
              <Text className="text-xs text-slate-500">({(barber as any).reviewCount})</Text>
            ) : null}
          </View>

          <Text className="text-sm font-medium text-slate-600">{barber.distance}</Text>
        </View>
      </View>
    </Pressable>
  );
}
