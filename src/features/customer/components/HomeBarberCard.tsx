/**
 * HomeBarberCard
 * Richer horizontal-scroll card for Customer Home sections (nearest / top
 * rated / home service). Built for the enriched NearbyBarber shape returned
 * by discoveryService -- image, name, service-type chip, rating, distance,
 * address, and a quick CTA.
 */
import { Image, Pressable, Text, View } from 'react-native';
import type { NearbyBarber } from '../types/customer';

interface HomeBarberCardProps {
  barber: NearbyBarber;
  onPress?: () => void;
}

export function HomeBarberCard({ barber, onPress }: HomeBarberCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="w-60 overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm mr-3"
    >
      {barber.imageUrl ? (
        <Image source={{ uri: barber.imageUrl }} className="h-28 w-full bg-slate-200" resizeMode="cover" />
      ) : (
        <View className="h-28 w-full items-center justify-center bg-[#EDEFFB]">
          <Text className="text-3xl">💈</Text>
        </View>
      )}

      <View className="p-3 gap-1.5">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {barber.name}
        </Text>

        {barber.serviceType ? (
          <View className="self-start rounded-full bg-[#EDEFFB] px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-[#363062]">{barber.serviceType}</Text>
          </View>
        ) : null}

        {barber.location ? (
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            📍 {barber.location}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between mt-0.5">
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-bold text-slate-900">⭐ {barber.rating?.toFixed(1) ?? '0.0'}</Text>
            {barber.reviewCount ? (
              <Text className="text-[10px] text-slate-400">({barber.reviewCount})</Text>
            ) : null}
          </View>
          {barber.distance ? <Text className="text-[10px] font-semibold text-[#D2691E]">{barber.distance}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}
