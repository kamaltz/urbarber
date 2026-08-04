/**
 * Booking Header Component - Shop info card at top of detail screens
 */

import { Image, Text, View } from 'react-native';
import { Shop } from '../types/booking';

export type BookingHeaderProps = {
  shop: Shop;
  backgroundColor?: string;
};

export function BookingHeader({ shop, backgroundColor = 'bg-orange-600' }: BookingHeaderProps) {
  return (
    <View className={`${backgroundColor} p-4 rounded-xl gap-3`}>
      <View className="flex-row gap-3">
        {/* Shop Image */}
        <Image
          source={{ uri: shop.imageUrl }}
          className="h-16 w-16 rounded-lg bg-slate-200"
        />

        {/* Shop Info */}
        <View className="flex-1 justify-center">
          <Text className="text-lg font-semibold text-white">{shop.name}</Text>

          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-sm text-white">📍</Text>
            <Text className="text-sm text-white opacity-90">{shop.location}</Text>
          </View>

          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-sm text-white">⭐</Text>
            <Text className="text-sm text-white opacity-90">{shop.rating}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
