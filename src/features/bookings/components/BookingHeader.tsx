import { Image, Text, View } from 'react-native';
import { Shop } from '../types/booking';

export type BookingHeaderProps = {
  shop: Shop;
  backgroundColor?: string;
};

export function BookingHeader({ shop, backgroundColor = 'bg-[#363062]' }: BookingHeaderProps) {
  return (
    <View className={`${backgroundColor} p-4.5 rounded-2xl gap-3 shadow-xs border border-slate-200/40`}>
      <View className="flex-row items-center gap-3.5">
        {/* Shop Image */}
        <Image
          source={{ uri: shop.imageUrl }}
          className="h-16 w-16 rounded-xl bg-slate-200/80 border border-white/20"
        />

        {/* Shop Info */}
        <View className="flex-1 justify-center">
          <Text className="text-base font-bold text-white" numberOfLines={1}>{shop.name}</Text>

          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-xs text-slate-200" numberOfLines={1}>📍 {shop.location || 'Garut'}</Text>
          </View>

          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-xs font-bold text-amber-300">⭐ {shop.rating ?? 5.0}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
