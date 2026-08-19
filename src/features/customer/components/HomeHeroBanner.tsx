/**
 * HomeHeroBanner
 * Promotional cover for Customer Home -- built from brand colors and the
 * existing app icon asset (no external stock imagery), so it never renders
 * as an empty/dead block even before any real promo content exists.
 */
import { Image, Pressable, Text, View } from 'react-native';

interface HomeHeroBannerProps {
  onPress?: () => void;
}

export function HomeHeroBanner({ onPress }: HomeHeroBannerProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mx-4 mb-5 overflow-hidden rounded-3xl bg-[#363062]"
      style={{ minHeight: 148 }}
    >
      {/* Decorative brand-color shapes, no external imagery */}
      <View
        className="absolute rounded-full bg-[#F99417]"
        style={{ width: 160, height: 160, top: -60, right: -40, opacity: 0.28 }}
      />
      <View
        className="absolute rounded-full bg-white"
        style={{ width: 90, height: 90, bottom: -30, left: -20, opacity: 0.08 }}
      />

      <View className="flex-1 flex-row items-center justify-between px-5 py-5">
        <View className="flex-1 pr-3">
          <View className="self-start rounded-full bg-[#F99417] px-2.5 py-1 mb-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#363062]">Promo Booking</Text>
          </View>
          <Text className="text-lg font-extrabold text-white leading-6">
            Tampil rapi tanpa antre,{'\n'}booking barber favoritmu sekarang
          </Text>
          <View className="mt-3 self-start rounded-xl bg-white px-4 py-2">
            <Text className="text-xs font-bold text-[#363062]">Cari Barber ›</Text>
          </View>
        </View>

        <Image
          source={require('@/assets/images/urbarber-icon-foreground.png')}
          style={{ width: 88, height: 88, opacity: 0.95 }}
          resizeMode="contain"
        />
      </View>
    </Pressable>
  );
}
