/**
 * FeaturedBarberCard Component
 * Displays featured barber hero card
 */

import { Image, Pressable, Text, View } from 'react-native';
import type { FeaturedBarber } from '../types/customer';

interface FeaturedBarberCardProps {
  barber: FeaturedBarber;
  onPress?: () => void;
  onFavoritePress?: () => void;
  sliderPosition?: number;
  totalSlides?: number;
}

export function FeaturedBarberCard({
  barber,
  onPress,
  onFavoritePress,
  sliderPosition = 0,
  totalSlides = 1,
}: FeaturedBarberCardProps) {
  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-2xl bg-white shadow-lg">
      {barber.imageUrl && (
        <Image
          source={{ uri: barber.imageUrl }}
          className="h-56 w-full bg-slate-200"
          resizeMode="cover"
        />
      )}

      <View className="gap-3 p-4">
        {/* Header with favorite button */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900">{barber.name}</Text>

            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-sm text-slate-600">📍 {barber.location}</Text>
            </View>
          </View>

          <Pressable
            onPress={onFavoritePress}
            className="h-10 w-10 items-center justify-center">
            <Text className="text-2xl">{barber.isFavorite ? '❤️' : '🤍'}</Text>
          </Pressable>
        </View>

        {/* Rating and distance */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Text className="font-bold text-slate-900">⭐ {barber.rating}</Text>

              {barber.reviewCount && (
                <Text className="text-xs text-slate-500">({barber.reviewCount})</Text>
              )}
            </View>

            <Text className="text-slate-600">• {barber.distance}</Text>
          </View>
        </View>

        {/* Service tags */}
        {barber.serviceTags.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {barber.serviceTags.map((tag) => (
              <View key={tag} className="rounded-full bg-orange-100 px-3 py-1">
                <Text className="text-xs font-medium text-orange-600">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Slider indicator */}
      {totalSlides > 1 && (
        <View className="flex-row items-center justify-center gap-1 px-4 pb-3">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <View
              key={idx}
              className={`h-1.5 rounded-full ${
                idx === sliderPosition ? 'w-6 bg-orange-600' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}
